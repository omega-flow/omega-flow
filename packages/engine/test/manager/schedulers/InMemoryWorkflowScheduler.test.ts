// @ts-nocheck
import type { Event, Workflow, Context } from "@omega-flow/types";
import {
  WorkflowManager,
  InMemoryWorkflowStore,
  InMemoryWorkflowMemory,
  InMemoryWorkflowScheduler,
} from "../../../src/manager";
import nodeTypes from "../../../src/nodes";

describe("WorkflowScheduler", () => {
  let scheduler: InMemoryWorkflowScheduler;
  let mockManager: {
    processEvent: jest.Mock<Promise<void>, [Event]>;
  };

  beforeEach(() => {
    scheduler = new InMemoryWorkflowScheduler();
    mockManager = {
      processEvent: jest.fn().mockResolvedValue(undefined),
    };
    scheduler.setWorkflowManager(mockManager);
  });

  it("should schedule and execute an event", async () => {
    const event: Event = {
      id: "event-1",
      type: "timeout",
      time: Date.now(),
    };

    await scheduler.schedule(event, 10);

    // Wait for the scheduled event to be processed
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(mockManager.processEvent).toHaveBeenCalledWith(event);
  });

  it("should return a schedule id", async () => {
    const event: Event = {
      id: "event-1",
      type: "timeout",
      time: Date.now(),
    };

    const scheduleId = await scheduler.schedule(event, 1000);
    expect(scheduleId).toMatch(/^schedule_\d+$/);
  });

  it("should cancel a scheduled event", async () => {
    const event: Event = {
      id: "event-1",
      type: "timeout",
      time: Date.now(),
    };

    const scheduleId = await scheduler.schedule(event, 100);
    const canceled = await scheduler.cancel(scheduleId);

    expect(canceled).toBe(true);

    // Wait to ensure event is not processed
    await new Promise((resolve) => setTimeout(resolve, 150));
    expect(mockManager.processEvent).not.toHaveBeenCalled();
  });

  it("should return false when canceling non-existent schedule", async () => {
    const canceled = await scheduler.cancel("non-existent");
    expect(canceled).toBe(false);
  });

  it("should track schedule count", async () => {
    expect(scheduler.getScheduleCount()).toBe(0);

    const event: Event = {
      id: "event-1",
      type: "timeout",
      time: Date.now(),
    };

    await scheduler.schedule(event, 1000);
    expect(scheduler.getScheduleCount()).toBe(1);

    await scheduler.schedule(event, 1000);
    expect(scheduler.getScheduleCount()).toBe(2);
  });

  it("should cancel all schedules", async () => {
    const event: Event = {
      id: "event-1",
      type: "timeout",
      time: Date.now(),
    };

    await scheduler.schedule(event, 1000);
    await scheduler.schedule(event, 1000);

    expect(scheduler.getScheduleCount()).toBe(2);

    await scheduler.cancelAll();
    expect(scheduler.getScheduleCount()).toBe(0);
  });

  it("should throw error when scheduling without workflow manager set", async () => {
    const schedulerWithoutManager = new InMemoryWorkflowScheduler();
    const event: Event = {
      id: "event-1",
      type: "timeout",
      time: Date.now(),
    };

    await expect(schedulerWithoutManager.schedule(event, 10)).rejects.toThrow(
      "WorkflowManager not set"
    );
  });
});
