// @ts-nocheck
import type { Event, Workflow, Context } from "@omega-flow/types";
import {
  WorkflowManager,
  InMemoryWorkflowStore,
  InMemoryWorkflowMemory,
  InMemoryWorkflowScheduler,
} from "../../src/manager";
import nodeTypes from "../../src/nodes";

describe("WorkflowManager", () => {
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

  it("should start a new workflow when triggered", async () => {
    const event: Event = {
      id: "e1",
      type: "user.created",
      time: Date.now(),
      data: { userId: "user-1" },
    };

    await manager.processEvent(event);

    const contexts = await memory.getContexts(
      testDomain,
      "workflow-1",
      "user-1"
    );
    expect(contexts.length).toBeGreaterThan(0);
    expect(contexts[0]?.workflowId).toBe("workflow-1");
  });

  it("should not start workflow for non-triggering event", async () => {
    const event: Event = {
      id: "e1",
      type: "user.deleted",
      time: Date.now(),
      data: { userId: "user-1" },
    };

    await manager.processEvent(event);

    const contexts = await memory.getContexts(
      testDomain,
      "workflow-1",
      "user-1"
    );
    expect(contexts.length).toBe(0);
  });

  it("should handle multiple subjects independently", async () => {
    const event1: Event = {
      id: "e1",
      type: "user.created",
      time: Date.now(),
      data: { userId: "user-1" },
    };

    const event2: Event = {
      id: "e2",
      type: "user.created",
      time: Date.now(),
      data: { userId: "user-2" },
    };

    await manager.processEvent(event1);
    await manager.processEvent(event2);

    const contexts1 = await memory.getContexts(
      testDomain,
      "workflow-1",
      "user-1"
    );
    const contexts2 = await memory.getContexts(
      testDomain,
      "workflow-1",
      "user-2"
    );

    expect(contexts1.length).toBeGreaterThan(0);
    expect(contexts2.length).toBeGreaterThan(0);
    expect(contexts1[0]?.workflowId).toBe("workflow-1");
    expect(contexts2[0]?.workflowId).toBe("workflow-1");
  });

  it("should resume existing workflow for subsequent events", async () => {
    // Create initial context - workflow is at Action node (node 2)
    const initialHistoryLength = 2;
    const initialContext: Context = {
      workflowId: "workflow-1",
      instanceId: "test-instance-1",
      currentNodeId: "2",
      nodeState: {},
      history: [
        {
          time: Date.now(),
          type: "started",
          fromNodeId: null,
          toNodeId: "1",
        },
        {
          time: Date.now(),
          type: "step",
          fromNodeId: "1",
          toNodeId: "2",
        },
      ],
      isCompleted: false,
      startedAt: Date.now(),
    };

    await memory.saveContext(
      testDomain,
      "workflow-1",
      "user-1",
      initialContext
    );

    const event: Event = {
      id: "e1",
      type: "any.event",
      time: Date.now(),
      data: { userId: "user-1" },
    };

    await manager.processEvent(event);

    const contexts = await memory.getContexts(
      testDomain,
      "workflow-1",
      "user-1"
    );
    // After processing, workflow should complete (Action -> Exit -> completed)
    // History should have more items than before (at least step to Exit and completed)
    expect(contexts[0]?.history.length).toBeGreaterThan(initialHistoryLength);
    expect(contexts[0]?.isCompleted).toBe(true);
  });

  it("should get contexts for a subject", async () => {
    const event: Event = {
      id: "e1",
      type: "user.created",
      time: Date.now(),
      data: { userId: "user-1" },
    };

    await manager.processEvent(event);

    const contexts = await memory.getContexts(
      testDomain,
      "workflow-1",
      "user-1"
    );
    expect(contexts.length).toBeGreaterThan(0);
    expect(contexts[0]?.workflowId).toBe("workflow-1");
  });

  it("should expose scheduler", () => {
    const schedulerInstance = manager.getScheduler();
    expect(schedulerInstance).toBe(scheduler);
  });

  it("should handle errors gracefully", async () => {
    const invalidWorkflow: Workflow = {
      id: "invalid-workflow",
      name: "Invalid",
      flow: {
        nodes: [
          {
            id: "1",
            type: "InvalidNodeType", // This will cause an error
            data: {},
            position: { x: 0, y: 0 },
          },
        ],
        edges: [],
      },
      options: {},
    };

    await store.setWorkflow(testDomain, invalidWorkflow);

    const event: Event = {
      id: "e1",
      type: "user.created",
      time: Date.now(),
      data: { userId: "user-1" },
    };

    // Should not throw - errors are caught and logged
    await expect(manager.processEvent(event)).resolves.not.toThrow();
  });
});
