// @ts-nocheck
import type { Workflow } from "@omega-flow/types";
import {
  WorkflowManager,
  InMemoryWorkflowStore,
  InMemoryWorkflowMemory,
  InMemoryWorkflowScheduler,
} from "../../src/manager";
import nodeTypes from "../../src/nodes";

describe("WorkflowManager options.enabled", () => {
  const testDomain = "test-domain";
  const subjectId = "user-1";

  const baseWorkflow: Workflow = {
    id: "workflow-1",
    name: "User Onboarding",
    flow: {
      nodes: [
        {
          id: "1",
          type: "Trigger",
          data: { label: "User Created", params: { event: "user.created" } },
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
    options: {},
  };

  const setup = (options: Workflow["options"]) => {
    const store = new InMemoryWorkflowStore([
      { domain: testDomain, workflow: { ...baseWorkflow, options } },
    ]);
    const memory = new InMemoryWorkflowMemory();
    const scheduler = new InMemoryWorkflowScheduler();
    const manager = new WorkflowManager({
      workflowStore: store,
      workflowMemory: memory,
      workflowScheduler: scheduler,
      nodeModels: nodeTypes,
      eventExtractor: (event) => [
        event.data?.domain || testDomain,
        event.data?.userId || subjectId,
      ],
    });
    scheduler.setWorkflowManager(manager);
    return { manager, memory };
  };

  const triggerEvent = {
    id: "evt-1",
    time: Date.now(),
    type: "user.created",
    data: { domain: testDomain, userId: subjectId },
  };

  it("does not start an instance when enabled === false", async () => {
    const { manager, memory } = setup({ enabled: false });

    await manager.processEvent(triggerEvent);

    const contexts = await memory.getContexts(testDomain, "workflow-1", subjectId);
    expect(contexts).toHaveLength(0);
  });

  it("runs when enabled is undefined (backward compatible)", async () => {
    const { manager, memory } = setup({});

    await manager.processEvent(triggerEvent);

    const contexts = await memory.getContexts(testDomain, "workflow-1", subjectId);
    expect(contexts.length).toBeGreaterThanOrEqual(1);
  });

  it("runs when enabled === true", async () => {
    const { manager, memory } = setup({ enabled: true });

    await manager.processEvent(triggerEvent);

    const contexts = await memory.getContexts(testDomain, "workflow-1", subjectId);
    expect(contexts.length).toBeGreaterThanOrEqual(1);
  });
});
