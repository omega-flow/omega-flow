import {
  CreateScheduleCommand,
  DeleteScheduleCommand,
  ResourceNotFoundException,
  SchedulerClient,
} from "@aws-sdk/client-scheduler";
import type { Event } from "@omega-flow/types";
import { mockClient } from "aws-sdk-client-mock";
import { SqsFifoWorkflowScheduler } from "../../src/schedulers/SqsFifoWorkflowScheduler";

const schedulerMock = mockClient(SchedulerClient);

const QUEUE_ARN = "arn:aws:sqs:us-east-1:123456789012:flow-events.fifo";
const ROLE_ARN = "arn:aws:iam::123456789012:role/omega-scheduler";

const sampleEvent: Event = {
  id: "evt-1",
  time: 1_700_000_000_000,
  type: "system:timeout",
  data: { storeId: "shopA", subjectId: "order-42" },
};

const messageGroupId = (event: Event) =>
  `${event.data.storeId}#${event.data.subjectId}`;

describe("SqsFifoWorkflowScheduler", () => {
  let scheduler: SqsFifoWorkflowScheduler;
  const FIXED_NOW = 1_700_000_000_000;

  beforeEach(() => {
    schedulerMock.reset();
    jest.spyOn(Date, "now").mockReturnValue(FIXED_NOW);
    scheduler = new SqsFifoWorkflowScheduler({
      client: new SchedulerClient({}),
      queueArn: QUEUE_ARN,
      roleArn: ROLE_ARN,
      messageGroupIdExtractor: messageGroupId,
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("schedule", () => {
    it("creates an SQS-target schedule with the FIFO MessageGroupId", async () => {
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
          Arn: QUEUE_ARN,
          RoleArn: ROLE_ARN,
          Input: JSON.stringify(sampleEvent),
          SqsParameters: {
            MessageGroupId: "shopA#order-42",
          },
        },
      });
    });
  });

  describe("cancel", () => {
    it("deletes the schedule and returns true", async () => {
      schedulerMock.on(DeleteScheduleCommand).resolves({});

      const result = await scheduler.cancel("omf-abc");

      expect(result).toBe(true);
      const calls = schedulerMock.commandCalls(DeleteScheduleCommand);
      expect(calls[0].args[0].input).toMatchObject({
        Name: "omf-abc",
        GroupName: "default",
      });
    });

    it("returns false when the schedule does not exist", async () => {
      schedulerMock.on(DeleteScheduleCommand).rejects(
        new ResourceNotFoundException({ $metadata: {}, message: "not found" })
      );

      const result = await scheduler.cancel("omf-missing");

      expect(result).toBe(false);
    });
  });
});
