import {
  CreateScheduleCommand,
  DeleteScheduleCommand,
  ResourceNotFoundException,
  SchedulerClient,
} from "@aws-sdk/client-scheduler";
import type { Event } from "@omega-flow/types";
import { mockClient } from "aws-sdk-client-mock";
import { EventBusWorkflowScheduler } from "../../src/schedulers/EventBusWorkflowScheduler";

const schedulerMock = mockClient(SchedulerClient);

const BUS_ARN = "arn:aws:events:us-east-1:123456789012:event-bus/omega";
const ROLE_ARN = "arn:aws:iam::123456789012:role/omega-scheduler";

const sampleEvent: Event = {
  id: "evt-1",
  time: 1_700_000_000_000,
  type: "user.signed_up",
  data: { userId: "u1" },
};

describe("EventBusWorkflowScheduler", () => {
  let scheduler: EventBusWorkflowScheduler;
  const FIXED_NOW = 1_700_000_000_000;

  beforeEach(() => {
    schedulerMock.reset();
    jest.spyOn(Date, "now").mockReturnValue(FIXED_NOW);
    scheduler = new EventBusWorkflowScheduler({
      client: new SchedulerClient({}),
      eventBusArn: BUS_ARN,
      roleArn: ROLE_ARN,
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("schedule", () => {
    it("creates a one-time schedule with at(...) expression and returns the name", async () => {
      schedulerMock.on(CreateScheduleCommand).resolves({});

      const id = await scheduler.schedule(sampleEvent, 60_000);

      expect(id).toMatch(/^omf-/);
      const calls = schedulerMock.commandCalls(CreateScheduleCommand);
      expect(calls).toHaveLength(1);
      const input = calls[0].args[0].input;
      const expectedFireAt = new Date(FIXED_NOW + 60_000)
        .toISOString()
        .slice(0, 19);
      expect(input).toMatchObject({
        Name: id,
        GroupName: "default",
        ScheduleExpression: `at(${expectedFireAt})`,
        ScheduleExpressionTimezone: "UTC",
        FlexibleTimeWindow: { Mode: "OFF" },
        ActionAfterCompletion: "DELETE",
        Target: {
          Arn: BUS_ARN,
          RoleArn: ROLE_ARN,
          Input: JSON.stringify(sampleEvent),
          EventBridgeParameters: {
            Source: "omega-flow",
            DetailType: "workflow.event",
          },
        },
      });
    });

    it("uses configured group, source and detailType", async () => {
      schedulerMock.on(CreateScheduleCommand).resolves({});
      const custom = new EventBusWorkflowScheduler({
        client: new SchedulerClient({}),
        eventBusArn: BUS_ARN,
        roleArn: ROLE_ARN,
        scheduleGroupName: "omega-prod",
        source: "custom.source",
        detailType: "custom.detail",
      });

      await custom.schedule(sampleEvent, 1000);

      const input = schedulerMock.commandCalls(CreateScheduleCommand)[0]
        .args[0].input;
      expect(input.GroupName).toBe("omega-prod");
      expect(input.Target?.EventBridgeParameters).toEqual({
        Source: "custom.source",
        DetailType: "custom.detail",
      });
    });

    it("generates unique schedule names across calls", async () => {
      schedulerMock.on(CreateScheduleCommand).resolves({});

      const a = await scheduler.schedule(sampleEvent, 1000);
      const b = await scheduler.schedule(sampleEvent, 1000);

      expect(a).not.toEqual(b);
    });
  });

  describe("cancel", () => {
    it("deletes the schedule and returns true", async () => {
      schedulerMock.on(DeleteScheduleCommand).resolves({});

      const result = await scheduler.cancel("omf-abc");

      expect(result).toBe(true);
      const calls = schedulerMock.commandCalls(DeleteScheduleCommand);
      expect(calls[0].args[0].input).toEqual({
        Name: "omf-abc",
        GroupName: "default",
      });
    });

    it("returns false when the schedule does not exist", async () => {
      schedulerMock.on(DeleteScheduleCommand).rejects(
        new ResourceNotFoundException({
          message: "Schedule not found",
          $metadata: {},
        })
      );

      const result = await scheduler.cancel("omf-missing");

      expect(result).toBe(false);
    });

    it("rethrows non-ResourceNotFound errors", async () => {
      schedulerMock
        .on(DeleteScheduleCommand)
        .rejects(new Error("Throttled"));

      await expect(scheduler.cancel("omf-abc")).rejects.toThrow("Throttled");
    });

    it("uses the configured group name on delete", async () => {
      schedulerMock.on(DeleteScheduleCommand).resolves({});
      const custom = new EventBusWorkflowScheduler({
        client: new SchedulerClient({}),
        eventBusArn: BUS_ARN,
        roleArn: ROLE_ARN,
        scheduleGroupName: "omega-prod",
      });

      await custom.cancel("omf-abc");

      const input = schedulerMock.commandCalls(DeleteScheduleCommand)[0]
        .args[0].input;
      expect(input.GroupName).toBe("omega-prod");
    });
  });
});
