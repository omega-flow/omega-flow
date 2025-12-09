// @ts-nocheck
import type { Event, Workflow, Context } from "@omega-flow/types";
import {
  WorkflowManager,
  InMemoryWorkflowStore,
  InMemoryWorkflowMemory,
  InMemoryWorkflowScheduler,
} from "../../../src/manager";
import nodeTypes from "../../../src/nodes";

describe("WorkflowMemory", () => {
  let memory: InMemoryWorkflowMemory;
  let sampleContext: Context;
  const testDomain = "test-domain";

  beforeEach(() => {
    memory = new InMemoryWorkflowMemory();
    sampleContext = {
      workflowId: "workflow-1",
      instanceId: "instance-1",
      currentNodeId: "node-1",
      nodeState: {},
      history: [],
      isCompleted: false,
      startedAt: Date.now(),
    };
  });

  it("should save and retrieve context", async () => {
    await memory.saveContext(
      testDomain,
      "workflow-1",
      "subject-1",
      sampleContext
    );
    const contexts = await memory.getContexts(
      testDomain,
      "workflow-1",
      "subject-1"
    );
    expect(contexts[0]).toEqual(sampleContext);
  });

  it("should return empty array for non-existent context", async () => {
    const contexts = await memory.getContexts(
      testDomain,
      "workflow-1",
      "subject-1"
    );
    expect(contexts.length).toBe(0);
  });

  it("should handle multiple subjects for same workflow", async () => {
    const context1 = {
      ...sampleContext,
      instanceId: "instance-1",
      currentNodeId: "node-1",
    };
    const context2 = {
      ...sampleContext,
      instanceId: "instance-2",
      currentNodeId: "node-2",
    };

    await memory.saveContext(testDomain, "workflow-1", "subject-1", context1);
    await memory.saveContext(testDomain, "workflow-1", "subject-2", context2);

    const contexts1 = await memory.getContexts(
      testDomain,
      "workflow-1",
      "subject-1"
    );
    const contexts2 = await memory.getContexts(
      testDomain,
      "workflow-1",
      "subject-2"
    );

    expect(contexts1[0]?.currentNodeId).toBe("node-1");
    expect(contexts2[0]?.currentNodeId).toBe("node-2");
  });

  it("should handle multiple workflows for same subject", async () => {
    const context1 = {
      ...sampleContext,
      instanceId: "instance-1",
      workflowId: "workflow-1",
    };
    const context2 = {
      ...sampleContext,
      instanceId: "instance-2",
      workflowId: "workflow-2",
    };

    await memory.saveContext(testDomain, "workflow-1", "subject-1", context1);
    await memory.saveContext(testDomain, "workflow-2", "subject-1", context2);

    const contexts1 = await memory.getContexts(
      testDomain,
      "workflow-1",
      "subject-1"
    );
    const contexts2 = await memory.getContexts(
      testDomain,
      "workflow-2",
      "subject-1"
    );

    expect(contexts1[0]?.workflowId).toBe("workflow-1");
    expect(contexts2[0]?.workflowId).toBe("workflow-2");
  });

  it("should delete context", async () => {
    await memory.saveContext(
      testDomain,
      "workflow-1",
      "subject-1",
      sampleContext
    );
    await memory.deleteContext(
      testDomain,
      "workflow-1",
      "subject-1",
      sampleContext.instanceId
    );

    const contexts = await memory.getContexts(
      testDomain,
      "workflow-1",
      "subject-1"
    );
    expect(contexts.length).toBe(0);
  });

  it("should isolate contexts by domain", async () => {
    const context1 = {
      ...sampleContext,
      instanceId: "instance-1",
      workflowId: "workflow-1",
    };
    const context2 = {
      ...sampleContext,
      instanceId: "instance-2",
      workflowId: "workflow-1",
    };

    await memory.saveContext("domain1", "workflow-1", "subject-1", context1);
    await memory.saveContext("domain2", "workflow-1", "subject-1", context2);

    const contexts1 = await memory.getContexts(
      "domain1",
      "workflow-1",
      "subject-1"
    );
    const contexts2 = await memory.getContexts(
      "domain2",
      "workflow-1",
      "subject-1"
    );

    expect(contexts1[0]).toEqual(context1);
    expect(contexts2[0]).toEqual(context2);
  });

  it("should clear all contexts", async () => {
    await memory.saveContext(
      testDomain,
      "workflow-1",
      "subject-1",
      sampleContext
    );
    await memory.clear();

    const contexts = await memory.getContexts(
      testDomain,
      "workflow-1",
      "subject-1"
    );
    expect(contexts.length).toBe(0);
  });
});
