// @ts-nocheck
import type { Event, Workflow, Context } from "@omega-flow/types";
import {
  WorkflowManager,
  InMemoryWorkflowStore,
  InMemoryWorkflowMemory,
  InMemoryWorkflowScheduler,
} from "../../../src/manager";
import nodeTypes from "../../../src/nodes";

describe("WorkflowStore", () => {
  let store: InMemoryWorkflowStore;
  let sampleWorkflow: Workflow;
  const testDomain = "test-domain";

  beforeEach(() => {
    sampleWorkflow = {
      id: "workflow-1",
      name: "Sample Workflow",
      flow: {
        nodes: [
          {
            id: "1",
            type: "Trigger",
            data: {
              label: "Start",
              params: { event: "user.created" },
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
        edges: [
          {
            id: "e1-2",
            source: "1",
            target: "2",
          },
        ],
      },
      options: {},
    };

    store = new InMemoryWorkflowStore([
      { domain: testDomain, workflow: sampleWorkflow },
    ]);
  });

  it("should retrieve a workflow by id", async () => {
    const workflow = await store.getWorkflow(testDomain, "workflow-1");
    expect(workflow).toEqual(sampleWorkflow);
  });

  it("should return null for non-existent workflow", async () => {
    const workflow = await store.getWorkflow(testDomain, "non-existent");
    expect(workflow).toBeNull();
  });

  it("should get all workflows for a domain", async () => {
    const workflows = await store.getAllWorkflows(testDomain);
    expect(workflows).toHaveLength(1);
    expect(workflows[0]).toEqual(sampleWorkflow);
  });

  it("should return empty array for non-existent domain", async () => {
    const workflows = await store.getAllWorkflows("non-existent-domain");
    expect(workflows).toHaveLength(0);
  });

  it("should add a new workflow", async () => {
    const newWorkflow: Workflow = {
      id: "workflow-2",
      name: "New Workflow",
      flow: { nodes: [], edges: [] },
      options: {},
    };

    await store.setWorkflow(testDomain, newWorkflow);
    const retrieved = await store.getWorkflow(testDomain, "workflow-2");
    expect(retrieved).toEqual(newWorkflow);
  });

  it("should update an existing workflow", async () => {
    const updated = { ...sampleWorkflow, name: "Updated Name" };
    await store.setWorkflow(testDomain, updated);

    const retrieved = await store.getWorkflow(testDomain, "workflow-1");
    expect(retrieved?.name).toBe("Updated Name");
  });

  it("should delete a workflow", async () => {
    await store.deleteWorkflow(testDomain, "workflow-1");
    const workflows = await store.getAllWorkflows(testDomain);
    expect(workflows).toHaveLength(0);
  });

  it("should isolate workflows by domain", async () => {
    const domain1Workflow: Workflow = {
      id: "wf-1",
      name: "Domain 1 Workflow",
      flow: { nodes: [], edges: [] },
      options: {},
    };

    const domain2Workflow: Workflow = {
      id: "wf-2",
      name: "Domain 2 Workflow",
      flow: { nodes: [], edges: [] },
      options: {},
    };

    await store.setWorkflow("domain1", domain1Workflow);
    await store.setWorkflow("domain2", domain2Workflow);

    const domain1Workflows = await store.getAllWorkflows("domain1");
    const domain2Workflows = await store.getAllWorkflows("domain2");

    expect(domain1Workflows).toHaveLength(1);
    expect(domain2Workflows).toHaveLength(1);
    expect(domain1Workflows[0].id).toBe("wf-1");
    expect(domain2Workflows[0].id).toBe("wf-2");
  });
});
