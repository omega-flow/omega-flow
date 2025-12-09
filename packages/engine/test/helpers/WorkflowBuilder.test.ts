import { WorkflowBuilder } from "./WorkflowBuilder";

describe("WorkflowBuilder", () => {
  describe("comparison with bare JSON", () => {
    it("should produce identical output to bare JSON for simple workflow", () => {
      const bareJson = {
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

      const fromBuilder = WorkflowBuilder.create("workflow-1", "Sample Workflow")
        .addNode("1", "Trigger", { label: "Start", params: { event: "user.created" } })
        .addNode("2", "Exit", { label: "End" })
        .addEdge("1", "2")
        .build();

      expect(fromBuilder).toEqual(bareJson);
    });

    it("should produce identical output to bare JSON for workflow with conditions", () => {
      const bareJson = {
        id: "onboarding",
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
              type: "Condition",
              data: {
                label: "Is Premium",
                conditions: {
                  all: [{ fact: "plan", operator: "equal", value: "premium" }],
                },
              },
              position: { x: 0, y: 100 },
            },
            {
              id: "3",
              type: "Action",
              data: { label: "Send Email", params: { action: "send_email" } },
              position: { x: 0, y: 200 },
            },
            {
              id: "4",
              type: "Exit",
              data: { label: "End" },
              position: { x: 0, y: 300 },
            },
          ],
          edges: [
            { id: "e1-2", source: "1", target: "2" },
            { id: "e2t-3", source: "2", target: "3", sourceHandle: "true" },
            { id: "e2f-4", source: "2", target: "4", sourceHandle: "false" },
            { id: "e3-4", source: "3", target: "4" },
          ],
        },
        options: {
          frequency: { type: "one_time" },
        },
      };

      const fromBuilder = WorkflowBuilder.create("onboarding", "User Onboarding")
        .addNode("1", "Trigger", { label: "User Created", params: { event: "user.created" } })
        .addNode("2", "Condition", {
          label: "Is Premium",
          conditions: { all: [{ fact: "plan", operator: "equal", value: "premium" }] },
        })
        .addNode("3", "Action", { label: "Send Email", params: { action: "send_email" } })
        .addNode("4", "Exit", { label: "End" })
        .addEdge("1", "2")
        .addEdge("2", "3", { sourceHandle: "true" })
        .addEdge("2", "4", { sourceHandle: "false" })
        .addEdge("3", "4")
        .oneTime()
        .build();

      expect(fromBuilder).toEqual(bareJson);
    });
  });

  describe("create", () => {
    it("should create a workflow with id and name", () => {
      const workflow = WorkflowBuilder.create("wf-1", "Test Workflow").build();

      expect(workflow.id).toBe("wf-1");
      expect(workflow.name).toBe("Test Workflow");
      expect(workflow.flow.nodes).toEqual([]);
      expect(workflow.flow.edges).toEqual([]);
      expect(workflow.options).toEqual({});
    });
  });

  describe("addNode", () => {
    it("should add a node with auto-generated position", () => {
      const workflow = WorkflowBuilder.create("wf-1", "Test")
        .addNode("1", "Trigger", { label: "Start", params: { event: "test" } })
        .build();

      expect(workflow.flow.nodes).toHaveLength(1);
      expect(workflow.flow.nodes[0]).toEqual({
        id: "1",
        type: "Trigger",
        data: { label: "Start", params: { event: "test" } },
        position: { x: 0, y: 0 },
      });
    });

    it("should auto-increment y position for each node", () => {
      const workflow = WorkflowBuilder.create("wf-1", "Test")
        .addNode("1", "Trigger", { params: { event: "test" } })
        .addNode("2", "Action", { params: { action: "do" } })
        .addNode("3", "Exit", { label: "End" })
        .build();

      expect(workflow.flow.nodes).toHaveLength(3);
      expect(workflow.flow.nodes[0].position).toEqual({ x: 0, y: 0 });
      expect(workflow.flow.nodes[1].position).toEqual({ x: 0, y: 100 });
      expect(workflow.flow.nodes[2].position).toEqual({ x: 0, y: 200 });
    });

    it("should allow node without data", () => {
      const workflow = WorkflowBuilder.create("wf-1", "Test")
        .addNode("1", "Exit")
        .build();

      expect(workflow.flow.nodes[0].data).toEqual({});
    });
  });

  describe("addEdge", () => {
    it("should add an edge with auto-generated id", () => {
      const workflow = WorkflowBuilder.create("wf-1", "Test")
        .addNode("1", "Trigger")
        .addNode("2", "Exit")
        .addEdge("1", "2")
        .build();

      expect(workflow.flow.edges).toHaveLength(1);
      expect(workflow.flow.edges[0]).toEqual({
        id: "e1-2",
        source: "1",
        target: "2",
      });
    });

    it("should include sourceHandle in edge id when provided", () => {
      const workflow = WorkflowBuilder.create("wf-1", "Test")
        .addNode("1", "Condition")
        .addNode("2", "Action")
        .addEdge("1", "2", { sourceHandle: "true" })
        .build();

      expect(workflow.flow.edges[0]).toEqual({
        id: "e1t-2",
        source: "1",
        target: "2",
        sourceHandle: "true",
      });
    });

    it("should include targetHandle when provided", () => {
      const workflow = WorkflowBuilder.create("wf-1", "Test")
        .addNode("1", "Trigger")
        .addNode("2", "Action")
        .addEdge("1", "2", { targetHandle: "input" })
        .build();

      expect(workflow.flow.edges[0]).toEqual({
        id: "e1-2",
        source: "1",
        target: "2",
        targetHandle: "input",
      });
    });
  });

  describe("withOptions", () => {
    it("should set workflow options", () => {
      const workflow = WorkflowBuilder.create("wf-1", "Test")
        .withOptions({ customOption: "value" })
        .build();

      expect(workflow.options).toEqual({ customOption: "value" });
    });

    it("should merge options when called multiple times", () => {
      const workflow = WorkflowBuilder.create("wf-1", "Test")
        .withOptions({ optionA: "a" })
        .withOptions({ optionB: "b" })
        .build();

      expect(workflow.options).toEqual({ optionA: "a", optionB: "b" });
    });
  });

  describe("oneTime", () => {
    it("should set frequency to one_time", () => {
      const workflow = WorkflowBuilder.create("wf-1", "Test").oneTime().build();

      expect(workflow.options.frequency).toEqual({ type: "one_time" });
    });
  });

  describe("everyRematch", () => {
    it("should set frequency to every_rematch without interval", () => {
      const workflow = WorkflowBuilder.create("wf-1", "Test")
        .everyRematch()
        .build();

      expect(workflow.options.frequency).toEqual({
        type: "every_rematch",
        interval: undefined,
      });
    });

    it("should set frequency to every_rematch with interval", () => {
      const workflow = WorkflowBuilder.create("wf-1", "Test")
        .everyRematch(60)
        .build();

      expect(workflow.options.frequency).toEqual({
        type: "every_rematch",
        interval: 60,
      });
    });
  });

  describe("full workflow example", () => {
    it("should build a complete workflow", () => {
      const workflow = WorkflowBuilder.create("onboarding", "User Onboarding")
        .addNode("1", "Trigger", {
          label: "User Created",
          params: { event: "user.created" },
        })
        .addNode("2", "Condition", {
          label: "Is Premium",
          conditions: {
            all: [{ fact: "plan", operator: "equal", value: "premium" }],
          },
        })
        .addNode("3", "Action", {
          label: "Send Premium Email",
          params: { action: "send_premium_email" },
        })
        .addNode("4", "Action", {
          label: "Send Basic Email",
          params: { action: "send_basic_email" },
        })
        .addNode("5", "Exit", { label: "End" })
        .addEdge("1", "2")
        .addEdge("2", "3", { sourceHandle: "true" })
        .addEdge("2", "4", { sourceHandle: "false" })
        .addEdge("3", "5")
        .addEdge("4", "5")
        .oneTime()
        .build();

      expect(workflow.id).toBe("onboarding");
      expect(workflow.name).toBe("User Onboarding");
      expect(workflow.flow.nodes).toHaveLength(5);
      expect(workflow.flow.edges).toHaveLength(5);
      expect(workflow.options.frequency?.type).toBe("one_time");
    });
  });
});
