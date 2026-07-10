import {
  CreateScheduleCommand,
  DeleteScheduleCommand,
  ResourceNotFoundException,
  SchedulerClient,
} from "@aws-sdk/client-scheduler";
import { SendMessageCommand, SQSClient } from "@aws-sdk/client-sqs";
import type { Event } from "@omega-flow/types";
import { mockClient } from "aws-sdk-client-mock";
import { SqsFifoWorkflowScheduler } from "../../src/schedulers/SqsFifoWorkflowScheduler";

const schedulerMock = mockClient(SchedulerClient);
const sqsMock = mockClient(SQSClient);

const QUEUE_ARN = "arn:aws:sqs:us-east-1:123456789012:flow-events.fifo";
const QUEUE_URL =
  "https://sqs.us-east-1.amazonaws.com/123456789012/flow-events.fifo";
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
    sqsMock.reset();
    jest.spyOn(Date, "now").mockReturnValue(FIXED_NOW);
    scheduler = new SqsFifoWorkflowScheduler({
      client: new SchedulerClient({}),
      sqsClient: new SQSClient({}),
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

    it("prefers explicit envelope routing over the messageGroupIdExtractor", async () => {
      schedulerMock.on(CreateScheduleCommand).resolves({});

      // Envelope says client:5, the extractor would derive shopA#order-42
      // from data — the envelope must win.
      const envelopeEvent: Event = {
        ...sampleEvent,
        domain: "shopA",
        subjectId: "client:5",
      };
      await scheduler.schedule(envelopeEvent, 60_000);

      const input =
        schedulerMock.commandCalls(CreateScheduleCommand)[0].args[0].input;
      expect(input.Target?.SqsParameters?.MessageGroupId).toBe("shopA#client:5");
    });

    it("works without a messageGroupIdExtractor when events carry envelope routing", async () => {
      schedulerMock.on(CreateScheduleCommand).resolves({});
      const envelopeOnly = new SqsFifoWorkflowScheduler({
        client: new SchedulerClient({}),
        queueArn: QUEUE_ARN,
        roleArn: ROLE_ARN,
      });

      await envelopeOnly.schedule(
        { ...sampleEvent, domain: "shopA", subjectId: "order-42" },
        60_000
      );

      const input =
        schedulerMock.commandCalls(CreateScheduleCommand)[0].args[0].input;
      expect(input.Target?.SqsParameters?.MessageGroupId).toBe("shopA#order-42");
    });

    it("throws when an event has neither envelope routing nor an extractor", async () => {
      const envelopeOnly = new SqsFifoWorkflowScheduler({
        client: new SchedulerClient({}),
        queueArn: QUEUE_ARN,
        roleArn: ROLE_ARN,
      });

      await expect(envelopeOnly.schedule(sampleEvent, 60_000)).rejects.toThrow(
        /Cannot derive MessageGroupId/
      );
    });

    it("clamps sub-minute delays a minute ahead (EventBridge rejects past times; late beats early)", async () => {
      schedulerMock.on(CreateScheduleCommand).resolves({});

      await scheduler.schedule(sampleEvent, 30_000);

      const input =
        schedulerMock.commandCalls(CreateScheduleCommand)[0].args[0].input;
      const expectedFireAt = new Date(FIXED_NOW + 60_000)
        .toISOString()
        .slice(0, 19);
      expect(input.ScheduleExpression).toBe(`at(${expectedFireAt})`);
    });
  });

  describe("immediate-send fast path (delay ≈ 0)", () => {
    const deliveryEvent: Event = {
      ...sampleEvent,
      id: "evt-src-1",
      type: "product.update",
      domain: "shopA",
      subjectId: "client:5",
      delivery: {
        workflowId: "back-in-stock",
        instanceId: "inst-1",
        nodeId: "wait-product",
        sourceSubjectId: "product:456",
      },
    };

    it("sends directly to SQS instead of creating a schedule", async () => {
      sqsMock.on(SendMessageCommand).resolves({ MessageId: "m-1" });

      const id = await scheduler.schedule(deliveryEvent, 0);

      expect(id).toMatch(/^sqs-immediate-/);
      expect(schedulerMock.commandCalls(CreateScheduleCommand)).toHaveLength(0);
      const calls = sqsMock.commandCalls(SendMessageCommand);
      expect(calls).toHaveLength(1);
      expect(calls[0].args[0].input).toMatchObject({
        QueueUrl: QUEUE_URL,
        MessageBody: JSON.stringify(deliveryEvent),
        MessageGroupId: "shopA#client:5",
        MessageDeduplicationId: "evt-src-1#inst-1#wait-product",
      });
    });

    it("gives delivery copies of one source event distinct dedup ids per subscriber", async () => {
      sqsMock.on(SendMessageCommand).resolves({ MessageId: "m-1" });

      await scheduler.schedule(deliveryEvent, 0);
      await scheduler.schedule(
        {
          ...deliveryEvent,
          subjectId: "client:9",
          delivery: { ...deliveryEvent.delivery!, instanceId: "inst-2" },
        },
        0
      );

      const ids = sqsMock
        .commandCalls(SendMessageCommand)
        .map((c) => c.args[0].input.MessageDeduplicationId);
      expect(ids[0]).not.toBe(ids[1]);
    });

    it("uses plain event.id as the dedup id for non-delivery events", async () => {
      sqsMock.on(SendMessageCommand).resolves({ MessageId: "m-1" });

      await scheduler.schedule(sampleEvent, 0);

      const input = sqsMock.commandCalls(SendMessageCommand)[0].args[0].input;
      expect(input.MessageDeduplicationId).toBe("evt-1");
      expect(input.MessageGroupId).toBe("shopA#order-42");
    });

    it("cancel of an immediate send returns false without calling EventBridge", async () => {
      sqsMock.on(SendMessageCommand).resolves({ MessageId: "m-1" });
      const id = await scheduler.schedule(deliveryEvent, 0);

      const result = await scheduler.cancel(id);

      expect(result).toBe(false);
      expect(schedulerMock.commandCalls(DeleteScheduleCommand)).toHaveLength(0);
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
        new ResourceNotFoundException({ $metadata: {}, message: "not found", Message: "not found" })
      );

      const result = await scheduler.cancel("omf-missing");

      expect(result).toBe(false);
    });
  });
});
