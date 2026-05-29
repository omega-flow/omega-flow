import {
  CreateScheduleCommand,
  DeleteScheduleCommand,
  ResourceNotFoundException,
  type SchedulerClient,
} from "@aws-sdk/client-scheduler";
import type { WorkflowScheduler } from "@omega-flow/engine";
import type { Event } from "@omega-flow/types";
import { nanoid } from "nanoid";

export interface EventBusWorkflowSchedulerConfig {
  client: SchedulerClient;
  /** ARN of the EventBridge bus that receives the scheduled event. */
  eventBusArn: string;
  /** IAM role assumed by EventBridge Scheduler to invoke the bus target. */
  roleArn: string;
  /** Schedule group name. Defaults to `default`. */
  scheduleGroupName?: string;
  /** EventBridge `Source` for the published event. Defaults to `omega-flow`. */
  source?: string;
  /** EventBridge `DetailType` for the published event. Defaults to `workflow.event`. */
  detailType?: string;
}

/**
 * EventBridge Scheduler-backed implementation of WorkflowScheduler.
 *
 * Creates one-time schedules that publish the workflow event to an EventBridge
 * bus when they fire. A downstream consumer (e.g. a Lambda subscribed to the
 * bus) is expected to deserialize the event and call `WorkflowManager.processEvent`.
 *
 * Schedules use `ActionAfterCompletion: DELETE` so AWS removes them once fired.
 */
export class EventBusWorkflowScheduler implements WorkflowScheduler {
  private client: SchedulerClient;
  private eventBusArn: string;
  private roleArn: string;
  private scheduleGroupName: string;
  private source: string;
  private detailType: string;

  constructor(config: EventBusWorkflowSchedulerConfig) {
    this.client = config.client;
    this.eventBusArn = config.eventBusArn;
    this.roleArn = config.roleArn;
    this.scheduleGroupName = config.scheduleGroupName ?? "default";
    this.source = config.source ?? "omega-flow";
    this.detailType = config.detailType ?? "workflow.event";
  }

  async schedule(event: Event, delayMs: number): Promise<string> {
    const fireAt = new Date(Date.now() + delayMs);
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
          Arn: this.eventBusArn,
          RoleArn: this.roleArn,
          Input: JSON.stringify(event),
          EventBridgeParameters: {
            Source: this.source,
            DetailType: this.detailType,
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
