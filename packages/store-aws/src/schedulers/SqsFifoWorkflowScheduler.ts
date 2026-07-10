import {
  CreateScheduleCommand,
  DeleteScheduleCommand,
  ResourceNotFoundException,
  type SchedulerClient,
} from "@aws-sdk/client-scheduler";
import { SendMessageCommand, SQSClient } from "@aws-sdk/client-sqs";
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
   * SQS client used for the immediate-send fast path (delay ≈ 0 — e.g.
   * subscription delivery copies), which bypasses EventBridge Scheduler and
   * calls `sqs:SendMessage` directly. Defaults to a client with the same
   * region as `queueArn`. NOTE: the *caller's* IAM role then needs
   * `sqs:SendMessage` on the queue (the `roleArn` only covers schedules).
   */
  sqsClient?: SQSClient;
  /**
   * URL of the target queue for the immediate-send fast path. Defaults to
   * the URL derived from `queueArn`
   * (`https://sqs.<region>.amazonaws.com/<account>/<name>`); set it
   * explicitly for non-standard partitions/endpoints.
   */
  queueUrl?: string;
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
   * Derives the FIFO `MessageDeduplicationId`, used by the immediate-send
   * fast path. Default: `${event.id}#${delivery.instanceId}#${delivery.nodeId}`
   * for subscription delivery copies (two copies of one source event
   * addressed at different subscribers must NOT dedup each other), plain
   * `event.id` otherwise.
   *
   * NOTE: the EventBridge Scheduler path cannot carry an explicit
   * `MessageDeduplicationId` (the SQS target does not expose it), so
   * scheduled (delayed) events still rely on the queue having
   * `ContentBasedDeduplication` enabled.
   */
  messageDeduplicationIdExtractor?: (event: Event) => string;
}

/**
 * Minimum lead time for a one-time EventBridge schedule: it rejects `at()`
 * expressions in the past and one-minute granularity is its floor.
 */
const MIN_DELAY_MS = 60 * 1000;

/**
 * Delays below this go through the immediate-send fast path (direct
 * `sqs:SendMessage`) instead of a one-time schedule. Only near-zero delays
 * qualify: FIFO queues do not support per-message `DelaySeconds`, so a real
 * delay (even a short one) must still be a schedule (clamped to
 * `MIN_DELAY_MS` — firing late is safer than firing early).
 */
const IMMEDIATE_THRESHOLD_MS = 1000;

/** `arn:aws:sqs:<region>:<account>:<name>` → standard queue URL. */
function queueUrlFromArn(queueArn: string): string {
  const [, , , region, account, name] = queueArn.split(":");
  if (!region || !account || !name) {
    throw new Error(`Cannot derive queue URL from ARN: ${queueArn}`);
  }
  return `https://sqs.${region}.amazonaws.com/${account}/${name}`;
}

/**
 * EventBridge Scheduler-backed implementation of WorkflowScheduler that targets
 * an SQS **FIFO** queue directly.
 *
 * Scheduled events land on the *same* FIFO queue as the webhook events, with
 * the *same* `MessageGroupId`, so a timeout and a webhook for one subject stay
 * strictly ordered and serialized. A downstream consumer (the `flowConsumer`
 * Lambda) deserializes each message and calls `WorkflowManager.processEvent`.
 *
 * Two paths:
 * - **delay ≈ 0** (subscription delivery copies): direct `sqs:SendMessage` —
 *   no EventBridge resource, no minute-granularity latency, no CreateSchedule
 *   TPS pressure under wildcard match storms.
 * - **real delays** (Wait wake-ups, timeouts): a one-time EventBridge
 *   schedule with `ActionAfterCompletion: DELETE`, clamped ≥ 1 minute ahead.
 */
export class SqsFifoWorkflowScheduler implements WorkflowScheduler {
  private client: SchedulerClient;
  private sqsClient: SQSClient;
  private queueArn: string;
  private queueUrl: string;
  private roleArn: string;
  private scheduleGroupName: string;
  private messageGroupIdExtractor?: (event: Event) => string;
  private messageDeduplicationIdExtractor: (event: Event) => string;

  constructor(config: SqsFifoWorkflowSchedulerConfig) {
    this.client = config.client;
    this.queueArn = config.queueArn;
    this.queueUrl = config.queueUrl ?? queueUrlFromArn(config.queueArn);
    this.sqsClient =
      config.sqsClient ??
      new SQSClient({ region: config.queueArn.split(":")[3] });
    this.roleArn = config.roleArn;
    this.scheduleGroupName = config.scheduleGroupName ?? "default";
    this.messageGroupIdExtractor = config.messageGroupIdExtractor;
    this.messageDeduplicationIdExtractor =
      config.messageDeduplicationIdExtractor ??
      ((event) =>
        event.delivery
          ? `${event.id}#${event.delivery.instanceId}#${event.delivery.nodeId}`
          : event.id);
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
    if (delayMs < IMMEDIATE_THRESHOLD_MS) {
      return this.sendImmediately(event);
    }

    const fireAt = new Date(Date.now() + Math.max(delayMs, MIN_DELAY_MS));
    const scheduleExpression = `at(${fireAt.toISOString().slice(0, 19)})`;
    const name = `omf-${nanoid(16)}`;

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

  /**
   * Immediate-send fast path: put the event straight on the queue. Unlike
   * the EventBridge path this can (and must, for queues without
   * content-based dedup) set an explicit `MessageDeduplicationId`.
   */
  private async sendImmediately(event: Event): Promise<string> {
    await this.sqsClient.send(
      new SendMessageCommand({
        QueueUrl: this.queueUrl,
        MessageBody: JSON.stringify(event),
        MessageGroupId: this.resolveMessageGroupId(event),
        MessageDeduplicationId: this.messageDeduplicationIdExtractor(event),
      })
    );
    // Not a schedule — nothing to cancel; the prefix makes that explicit.
    return `sqs-immediate-${nanoid(16)}`;
  }

  async cancel(scheduleId: string): Promise<boolean> {
    // Immediate sends are already on the queue — there is nothing to cancel.
    if (scheduleId.startsWith("sqs-immediate-")) {
      return false;
    }
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
