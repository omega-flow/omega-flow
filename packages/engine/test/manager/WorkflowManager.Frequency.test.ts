// @ts-nocheck
import type { Event, Workflow, Context } from "@omega-flow/types";
import {
  WorkflowManager,
  InMemoryWorkflowStore,
  InMemoryWorkflowMemory,
  InMemoryWorkflowScheduler,
} from "../../src/manager";
import nodeTypes from "../../src/nodes";

describe("WorkflowManager Frequency", () => {
  let manager: WorkflowManager;
  let store: InMemoryWorkflowStore;
  let memory: InMemoryWorkflowMemory;
  let scheduler: InMemoryWorkflowScheduler;
  const testDomain = "test-domain";

  const sampleWorkflow: Workflow = {
    id: "workflow-1",
    name: "User Onboarding",
    flow: {
      nodes: [
        {
          id: "1",
          type: "Trigger",
          data: {
            label: "User Created",
            params: { event: "user.created" },
          },
          position: { x: 0, y: 0 },
        },
        {
          id: "2",
          type: "Action",
          data: {
            label: "Send Welcome Email",
            params: { action: "send_email" },
          },
          position: { x: 0, y: 100 },
        },
        {
          id: "3",
          type: "Exit",
          data: { label: "End" },
          position: { x: 0, y: 200 },
        },
      ],
      edges: [
        { id: "e1-2", source: "1", target: "2" },
        { id: "e2-3", source: "2", target: "3" },
      ],
    },
    options: {},
  };

  beforeEach(() => {
    store = new InMemoryWorkflowStore([
      { domain: testDomain, workflow: sampleWorkflow },
    ]);
    memory = new InMemoryWorkflowMemory();
    scheduler = new InMemoryWorkflowScheduler();

    manager = new WorkflowManager({
      workflowStore: store,
      workflowMemory: memory,
      workflowScheduler: scheduler,
      nodeModels: nodeTypes,
      eventExtractor: (event) => [
        event.data?.domain || testDomain,
        event.data?.userId || "unknown",
      ],
    });

    // Set the workflow manager reference in the scheduler
    scheduler.setWorkflowManager(manager);
  });

  it("should not restart completed workflow with one_time frequency (default)", async () => {
    // Create completed context
    const completedContext: Context = {
      workflowId: "workflow-1",
      instanceId: "completed-instance",
      currentNodeId: null,
      nodeState: {},
      history: [],
      isCompleted: true,
      startedAt: Date.now() - 10000, // Started 10 seconds ago
    };

    await memory.saveContext(
      testDomain,
      "workflow-1",
      "user-1",
      completedContext
    );

    const event: Event = {
      id: "e1",
      type: "user.created",
      time: Date.now(),
      data: { userId: "user-1" },
    };

    await manager.processEvent(event);

    // Should not create a new instance - getContext should return the old completed one
    const contexts = await memory.getContexts(
      testDomain,
      "workflow-1",
      "user-1"
    );
    expect(contexts.length).toBe(1);
    expect(contexts[0].instanceId).toBe("completed-instance");
    expect(contexts[0].isCompleted).toBe(true);
  });

  describe("Frequency: one_time", () => {
    let oneTimeWorkflow: Workflow;

    beforeEach(() => {
      oneTimeWorkflow = {
        id: "one-time-workflow",
        name: "One Time Workflow",
        flow: {
          nodes: [
            {
              id: "1",
              type: "Trigger",
              data: {
                label: "Order Created",
                params: { event: "order.created" },
              },
              position: { x: 0, y: 0 },
            },
            {
              id: "2",
              type: "Exit",
              data: { label: "End" },
              position: { x: 0, y: 100 },
            },
          ],
          edges: [{ id: "e1-2", source: "1", target: "2" }],
        },
        options: {
          frequency: {
            type: "one_time",
          },
        },
      };
    });

    it("should start workflow on first trigger", async () => {
      await store.setWorkflow(testDomain, oneTimeWorkflow);

      const event: Event = {
        id: "e1",
        type: "order.created",
        time: Date.now(),
        data: { userId: "user-1", orderId: "order-1" },
      };

      await manager.processEvent(event);

      const contexts = await memory.getContexts(
        testDomain,
        "one-time-workflow",
        "user-1"
      );
      expect(contexts.length).toBe(1);
      expect(contexts[0].isCompleted).toBe(true);
    });

    it("should not start workflow again after completion", async () => {
      await store.setWorkflow(testDomain, oneTimeWorkflow);

      const event1: Event = {
        id: "e1",
        type: "order.created",
        time: Date.now(),
        data: { userId: "user-1", orderId: "order-1" },
      };

      await manager.processEvent(event1);

      const firstContexts = await memory.getContexts(
        testDomain,
        "one-time-workflow",
        "user-1"
      );
      expect(firstContexts.length).toBe(1);
      const firstInstanceId = firstContexts[0].instanceId;

      // Try to trigger again
      const event2: Event = {
        id: "e2",
        type: "order.created",
        time: Date.now() + 1000,
        data: { userId: "user-1", orderId: "order-2" },
      };

      await manager.processEvent(event2);

      // Should still have only one instance
      const secondContexts = await memory.getContexts(
        testDomain,
        "one-time-workflow",
        "user-1"
      );
      expect(secondContexts.length).toBe(1);
      expect(secondContexts[0].instanceId).toBe(firstInstanceId);
    });

    it("should not start second instance while first is active", async () => {
      // Create a workflow that waits (doesn't complete immediately)
      const waitingWorkflow: Workflow = {
        id: "waiting-workflow",
        name: "Waiting Workflow",
        flow: {
          nodes: [
            {
              id: "1",
              type: "Trigger",
              data: {
                label: "Order Created",
                params: { event: "order.created" },
              },
              position: { x: 0, y: 0 },
            },
            {
              id: "2",
              type: "Trigger",
              data: {
                label: "Wait for Payment",
                params: { event: "payment.completed" },
              },
              position: { x: 0, y: 100 },
            },
            {
              id: "3",
              type: "Exit",
              data: { label: "End" },
              position: { x: 0, y: 200 },
            },
          ],
          edges: [
            { id: "e1-2", source: "1", target: "2" },
            { id: "e2-3", source: "2", target: "3" },
          ],
        },
        options: {
          frequency: {
            type: "one_time",
          },
        },
      };

      await store.setWorkflow(testDomain, waitingWorkflow);

      const event1: Event = {
        id: "e1",
        type: "order.created",
        time: Date.now(),
        data: { userId: "user-1", orderId: "order-1" },
      };

      await manager.processEvent(event1);

      const firstContexts = await memory.getContexts(
        testDomain,
        "waiting-workflow",
        "user-1"
      );
      expect(firstContexts.length).toBe(1);
      expect(firstContexts[0].isCompleted).toBe(false);
      const firstInstanceId = firstContexts[0].instanceId;

      // Try to trigger again while first is still active
      const event2: Event = {
        id: "e2",
        type: "order.created",
        time: Date.now() + 1000,
        data: { userId: "user-1", orderId: "order-2" },
      };

      await manager.processEvent(event2);

      // Should still have only one instance
      const secondContexts = await memory.getContexts(
        testDomain,
        "waiting-workflow",
        "user-1"
      );
      expect(secondContexts.length).toBe(1);
      expect(secondContexts[0].instanceId).toBe(firstInstanceId);
      expect(secondContexts[0].isCompleted).toBe(false);
    });
  });

  describe("Frequency: every_rematch", () => {
    let everyRematchWorkflow: Workflow;

    beforeEach(() => {
      everyRematchWorkflow = {
        id: "every-rematch-workflow",
        name: "Every Rematch Workflow",
        flow: {
          nodes: [
            {
              id: "1",
              type: "Trigger",
              data: {
                label: "Order Created",
                params: { event: "order.created" },
              },
              position: { x: 0, y: 0 },
            },
            {
              id: "2",
              type: "Exit",
              data: { label: "End" },
              position: { x: 0, y: 100 },
            },
          ],
          edges: [{ id: "e1-2", source: "1", target: "2" }],
        },
        options: {
          frequency: {
            type: "every_rematch",
          },
        },
      };
    });

    it("should start workflow on first trigger", async () => {
      await store.setWorkflow(testDomain, everyRematchWorkflow);

      const event: Event = {
        id: "e1",
        type: "order.created",
        time: Date.now(),
        data: { userId: "user-1", orderId: "order-1" },
      };

      await manager.processEvent(event);

      const contexts = await memory.getContexts(
        testDomain,
        "every-rematch-workflow",
        "user-1"
      );
      expect(contexts.length).toBe(1);
      expect(contexts[0].isCompleted).toBe(true);
    });

    it("should start new instance after previous completes", async () => {
      await store.setWorkflow(testDomain, everyRematchWorkflow);

      const event1: Event = {
        id: "e1",
        type: "order.created",
        time: Date.now(),
        data: { userId: "user-1", orderId: "order-1" },
      };

      await manager.processEvent(event1);

      const firstContexts = await memory.getContexts(
        testDomain,
        "every-rematch-workflow",
        "user-1"
      );
      expect(firstContexts.length).toBe(1);
      const firstInstanceId = firstContexts[0].instanceId;

      // Trigger again after completion
      const event2: Event = {
        id: "e2",
        type: "order.created",
        time: Date.now() + 1000,
        data: { userId: "user-1", orderId: "order-2" },
      };

      await manager.processEvent(event2);

      // Should have two instances now
      const secondContexts = await memory.getContexts(
        testDomain,
        "every-rematch-workflow",
        "user-1"
      );
      expect(secondContexts.length).toBe(2);
      expect(
        secondContexts.some((ctx) => ctx.instanceId === firstInstanceId)
      ).toBe(true);
      expect(secondContexts.every((ctx) => ctx.isCompleted)).toBe(true);
    });

    it("should not start second instance while first is active", async () => {
      // Create a workflow that waits
      const waitingWorkflow: Workflow = {
        id: "waiting-rematch-workflow",
        name: "Waiting Every Rematch Workflow",
        flow: {
          nodes: [
            {
              id: "1",
              type: "Trigger",
              data: {
                label: "Order Created",
                params: { event: "order.created" },
              },
              position: { x: 0, y: 0 },
            },
            {
              id: "2",
              type: "Trigger",
              data: {
                label: "Wait for Payment",
                params: { event: "payment.completed" },
              },
              position: { x: 0, y: 100 },
            },
            {
              id: "3",
              type: "Exit",
              data: { label: "End" },
              position: { x: 0, y: 200 },
            },
          ],
          edges: [
            { id: "e1-2", source: "1", target: "2" },
            { id: "e2-3", source: "2", target: "3" },
          ],
        },
        options: {
          frequency: {
            type: "every_rematch",
          },
        },
      };

      await store.setWorkflow(testDomain, waitingWorkflow);

      const event1: Event = {
        id: "e1",
        type: "order.created",
        time: Date.now(),
        data: { userId: "user-1", orderId: "order-1" },
      };

      await manager.processEvent(event1);

      const firstContexts = await memory.getContexts(
        testDomain,
        "waiting-rematch-workflow",
        "user-1"
      );
      expect(firstContexts.length).toBe(1);
      expect(firstContexts[0].isCompleted).toBe(false);
      const firstInstanceId = firstContexts[0].instanceId;

      // Try to trigger again while first is still active
      const event2: Event = {
        id: "e2",
        type: "order.created",
        time: Date.now() + 1000,
        data: { userId: "user-1", orderId: "order-2" },
      };

      await manager.processEvent(event2);

      // Should still have only one instance (can't start while active)
      const secondContexts = await memory.getContexts(
        testDomain,
        "waiting-rematch-workflow",
        "user-1"
      );
      expect(secondContexts.length).toBe(1);
      expect(secondContexts[0].instanceId).toBe(firstInstanceId);
    });

    it("should respect interval restriction", async () => {
      const intervalWorkflow: Workflow = {
        ...everyRematchWorkflow,
        id: "interval-workflow",
        options: {
          frequency: {
            type: "every_rematch",
            interval: 5, // 5 seconds
          },
        },
      };

      await store.setWorkflow(testDomain, intervalWorkflow);

      const startTime = Date.now();

      const event1: Event = {
        id: "e1",
        type: "order.created",
        time: startTime,
        data: { userId: "user-1", orderId: "order-1" },
      };

      await manager.processEvent(event1);

      const firstContexts = await memory.getContexts(
        testDomain,
        "interval-workflow",
        "user-1"
      );
      expect(firstContexts.length).toBe(1);
      const firstInstanceId = firstContexts[0].instanceId;

      // Try to trigger again before interval passes (only 2 seconds later)
      const event2: Event = {
        id: "e2",
        type: "order.created",
        time: startTime + 2000,
        data: { userId: "user-1", orderId: "order-2" },
      };

      // Mock Date.now to return time 2 seconds after start
      const originalNow = Date.now;
      Date.now = jest.fn(() => startTime + 2000);

      await manager.processEvent(event2);

      // Should still have only one instance (interval not passed)
      let contexts = await memory.getContexts(
        testDomain,
        "interval-workflow",
        "user-1"
      );
      expect(contexts.length).toBe(1);
      expect(contexts[0].instanceId).toBe(firstInstanceId);

      // Try again after interval passes (6 seconds later)
      const event3: Event = {
        id: "e3",
        type: "order.created",
        time: startTime + 6000,
        data: { userId: "user-1", orderId: "order-3" },
      };

      Date.now = jest.fn(() => startTime + 6000);

      await manager.processEvent(event3);

      // Should now have two instances (interval passed)
      contexts = await memory.getContexts(
        testDomain,
        "interval-workflow",
        "user-1"
      );
      expect(contexts.length).toBe(2);

      // Restore Date.now
      Date.now = originalNow;
    });
  });
});
