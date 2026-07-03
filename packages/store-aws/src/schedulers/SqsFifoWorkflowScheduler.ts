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
   * Derives the FIFO `MessageGroupId` from the scheduled event. MUST produce the
   * same key the consumer's `eventExtractor` and the webhook producer use
   * (`${domain}#${subjectId}`) so a Wait-node wake-up stays serialized with the
   * webhooks for the same subject.
   */
  messageGroupIdExtractor: (event: Event) => string;
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
export class SqsFifoWorkflowScheduler implements WorkflowScheduler {
  private client: SchedulerClient;
  private queueArn: string;
  private roleArn: string;
  private scheduleGroupName: string;
  private messageGroupIdExtractor: (event: Event) => string;
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

  async schedule(event: Event, delayMs: number): Promise<string> {
    const fireAt = new Date(Date.now() + delayMs);
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
            MessageGroupId: this.messageGroupIdExtractor(event),
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
