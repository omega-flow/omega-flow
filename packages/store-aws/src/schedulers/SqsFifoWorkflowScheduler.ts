import {
  CreateScheduleCommand,
  DeleteScheduleCommand,
  ResourceNotFoundException,
  type SchedulerClient,
} from "@aws-sdk/client-scheduler";
import type { WorkflowScheduler } from "@omega-flow/engine";
import type { Event } from "@omega-flow/types";
import { nanoid } from "nanoid";

export interface SqsFifoWorkflowSchedulerConfig {
  client: SchedulerClient;
  /** ARN of the target SQS **FIFO** queue (must end with `.fifo`). */
  queueArn: string;
  /** IAM role assumed by EventBridge Scheduler to `sqs:SendMessage` to the queue. */
  roleArn: string;
  /** Schedule group name. Defaults to `default`. */
  scheduleGroupName?: string;
  /**
   * Derives the FIFO `MessageGroupId` from a scheduled event that carries no
   * explicit envelope routing. MUST produce the same key the consumer's
   * `eventExtractor` and the webhook producer use (`${domain}#${subjectId}`)
   * so a Wait-node wake-up stays serialized with the webhooks for the same
   * subject.
   *
   * Precedence: when the event has top-level `domain` and `subjectId`
   * (explicit envelope routing — e.g. subscription delivery copies created by
   * the engine), the group is `${event.domain}#${event.subjectId}` and this
   * extractor is not called. Optional — a host whose events always carry
   * envelope routing needs no extractor; scheduling an event that has neither
   * is an error.
   */
  messageGroupIdExtractor?: (event: Event) => string;
  /**
   * Derives the FIFO `MessageDeduplicationId`. Defaults to `event.id`.
   *
   * NOTE: EventBridge Scheduler's SQS target does **not** expose a
   * `MessageDeduplicationId` parameter, so this value cannot be sent with the
   * message. Timer-event dedup therefore relies on the queue having
   * `ContentBasedDeduplication` enabled (the unique `event.id` in the body keeps
   * each scheduled event distinct). This extractor is retained for parity with
   * the producer and is reserved for future use / documentation.
   */
  messageDeduplicationIdExtractor?: (event: Event) => string;
}

/**
 * EventBridge Scheduler-backed implementation of WorkflowScheduler that targets
 * an SQS **FIFO** queue directly.
 *
 * Wait-node wake-ups land on the *same* FIFO queue as the webhook events, with
 * the *same* `MessageGroupId`, so a timeout and a webhook for one subject stay
 * strictly ordered and serialized. A downstream consumer (the `flowConsumer`
 * Lambda) deserializes each message and calls `WorkflowManager.processEvent`.
 *
 * Schedules use `ActionAfterCompletion: DELETE` so AWS removes them once fired.
 */
/**
 * Minimum lead time for a one-time schedule. EventBridge Scheduler rejects
 * `at()` expressions in the past and one-minute granularity is its floor, so
 * near-now schedules (e.g. subscription delivery copies scheduled with
 * delay 0) are clamped a full minute ahead to never race the CreateSchedule
 * call itself.
 */
const MIN_DELAY_MS = 60 * 1000;

export class SqsFifoWorkflowScheduler implements WorkflowScheduler {
  private client: SchedulerClient;
  private queueArn: string;
  private roleArn: string;
  private scheduleGroupName: string;
  private messageGroupIdExtractor?: (event: Event) => string;
  private messageDeduplicationIdExtractor: (event: Event) => string;

  constructor(config: SqsFifoWorkflowSchedulerConfig) {
    this.client = config.client;
    this.queueArn = config.queueArn;
    this.roleArn = config.roleArn;
    this.scheduleGroupName = config.scheduleGroupName ?? "default";
    this.messageGroupIdExtractor = config.messageGroupIdExtractor;
    this.messageDeduplicationIdExtractor =
      config.messageDeduplicationIdExtractor ?? ((event) => event.id);
  }

  /**
   * FIFO group for an event: explicit envelope routing wins (matches the
   * engine's routing precedence), the host extractor is the fallback.
   */
  private resolveMessageGroupId(event: Event): string {
    if (event.domain != null && event.subjectId != null) {
      return `${event.domain}#${event.subjectId}`;
    }
    if (this.messageGroupIdExtractor) {
      return this.messageGroupIdExtractor(event);
    }
    throw new Error(
      `Cannot derive MessageGroupId for event ${event.id} (${event.type}): it carries no domain/subjectId and no messageGroupIdExtractor is configured`
    );
  }

  async schedule(event: Event, delayMs: number): Promise<string> {
    const fireAt = new Date(Date.now() + Math.max(delayMs, MIN_DELAY_MS));
    const scheduleExpression = `at(${fireAt.toISOString().slice(0, 19)})`;
    const name = `omf-${nanoid(16)}`;

    // Resolved for parity/validation; see config note — the SQS target cannot
    // carry an explicit MessageDeduplicationId, so this is not sent.
    this.messageDeduplicationIdExtractor(event);

    await this.client.send(
      new CreateScheduleCommand({
        Name: name,
        GroupName: this.scheduleGroupName,
        ScheduleExpression: scheduleExpression,
        ScheduleExpressionTimezone: "UTC",
        FlexibleTimeWindow: { Mode: "OFF" },
        ActionAfterCompletion: "DELETE",
        Target: {
          Arn: this.queueArn,
          RoleArn: this.roleArn,
          Input: JSON.stringify(event),
          SqsParameters: {
            MessageGroupId: this.resolveMessageGroupId(event),
          },
        },
      })
    );

    return name;
  }

  async cancel(scheduleId: string): Promise<boolean> {
    try {
      await this.client.send(
        new DeleteScheduleCommand({
          Name: scheduleId,
          GroupName: this.scheduleGroupName,
        })
      );
      return true;
    } catch (err) {
      if (err instanceof ResourceNotFoundException) {
        return false;
      }
      throw err;
    }
  }
}
