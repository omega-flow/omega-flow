// @ts-nocheck
import WorkflowModel from "./../src/engine/WorkflowModel";
import nodeTypes from "./../src/nodes";

let sampleWorkflow;
let sampleContext;

describe("WorkflowModel Basics", () => {
  beforeEach(() => {
    sampleWorkflow = {
      id: "1",
      flow: {
        nodes: [
          {
            id: "1",
            type: "SegmentChange",
            data: { label: "Node 1" },
            position: { x: 0, y: -50 },
            measured: { width: 150, height: 36 },
          },
          {
            id: "2",
            type: "Action",
            data: { label: "Node 2" },
            position: { x: 0, y: 50 },
            measured: { width: 150, height: 36 },
          },
        ],
        edges: [{ id: "e1-2", source: "1", target: "2" }],
        viewport: {
          x: 484.74631195103916,
          y: 189.61067224968303,
          zoom: 0.5486659687896216,
        },
      },
      options: {},
    };

    sampleContext = {
      workflowId: "1",
      currentNodeId: "2",
      nodeState: {
        1: { data: {} },
        2: { data: {} },
      },
      history: [
        {
          time: 123456789,
          type: "event",
        },
        {
          time: 123456789,
          type: "step",
          fromNodeId: null,
          toNodeId: "1",
        },
      ],
    };
  });

  describe("Creating", () => {
    it("should create workflow instance", () => {
      const workflow = new WorkflowModel(sampleWorkflow, nodeTypes);
      expect(workflow).toBeDefined();
    });

    it("should throw error because there is no start node", () => {
      // Invalid workflow
      // 1 > 2
      // 2 > 1
      const invalidWorkflow = {
        ...sampleWorkflow,
        flow: {
          ...sampleWorkflow.flow,
          edges: [
            ...sampleWorkflow.flow.edges,
            { id: "e1-2", source: "2", target: "1" },
          ],
        },
      };
      expect(() => {
        new WorkflowModel(invalidWorkflow, nodeTypes);
      }).toThrow("Workflow does not have a start node");
    });
  });

  describe("Validation", () => {
    it("should throw error when flow id missing", () => {
      const invalidWorkflow = {
        flow: sampleWorkflow.flow,
        options: {},
      };

      expect(() => {
        new WorkflowModel(invalidWorkflow, nodeTypes);
      }).toThrow("Invalid workflow data");
    });

    it("should throw error when flow is missing", () => {
      const invalidWorkflow = {
        id: 1,
        options: {},
      };

      expect(() => {
        new WorkflowModel(invalidWorkflow, nodeTypes);
      }).toThrow("Invalid workflow data");
    });

    it("should throw error when options is missing", () => {
      const invalidWorkflow = {
        id: 1,
        flow: sampleWorkflow.flow,
      };

      expect(() => {
        new WorkflowModel(invalidWorkflow, nodeTypes);
      }).toThrow("Invalid workflow data");
    });
  });

  describe("Restore context", () => {
    it("should be ok", () => {
      const workflow = new WorkflowModel(sampleWorkflow, nodeTypes);
      expect(() => {
        workflow.setContext(sampleContext);
      }).not.toThrow();
      expect(workflow.status).toBe("idle");
    });

    it("should throw error when workflow id does not match", () => {
      const workflow = new WorkflowModel(sampleWorkflow, nodeTypes);
      const invalidContext = { ...sampleContext, workflowId: "2" };
      expect(() => {
        workflow.setContext(invalidContext);
      }).toThrow("Workflow id does not match");
      expect(workflow.status).toBe("idle");
    });

    it("should throw error when current node does not exist", () => {
      const workflow = new WorkflowModel(sampleWorkflow, nodeTypes);
      const invalidContext = { ...sampleContext, currentNodeId: "3" };
      expect(() => {
        workflow.setContext(invalidContext);
      }).toThrow("Current node does not exist in workflow");
      expect(workflow.status).toBe("idle");
    });
  });

  describe("Starting workflow", () => {
    it("shouldn't have current node before start", () => {
      const workflow = new WorkflowModel(sampleWorkflow, nodeTypes);
      expect(() => {
        workflow.getCurrentNode();
      }).toThrow("Workflow is not running");
    });

    it("should start workflow without context defined", () => {
      const workflow = new WorkflowModel(sampleWorkflow, nodeTypes);
      expect(() => {
        workflow.start();
      }).not.toThrow();
      expect(workflow.status).toBe("waiting");
      expect(workflow.getCurrentNode().getId()).toEqual("1");
    });

    it("should start workflow with context defined", () => {
      const workflow = new WorkflowModel(sampleWorkflow, nodeTypes);
      expect(() => {
        workflow.setContext(sampleContext);
        expect(workflow.status).toBe("idle");
        workflow.start();
      }).not.toThrow();
      expect(workflow.status).toBe("waiting");
      expect(workflow.getCurrentNode().getId()).toEqual("2");
    });

    it("should not allow to start twice", () => {
      const workflow = new WorkflowModel(sampleWorkflow, nodeTypes);
      // First start
      expect(() => {
        workflow.start();
      }).not.toThrow();
      // Second start
      expect(() => {
        workflow.start();
      }).toThrow("Workflow is already running");
    });
  });

  describe("Saving context", () => {
    it("should save context, exact the same as was set on teh first place", () => {
      const workflow = new WorkflowModel(sampleWorkflow, nodeTypes);
      workflow.setContext(sampleContext);
      workflow.start();
      const context = workflow.getContext();
      expect(context.workflowId).toEqual(sampleContext.workflowId);
      expect(context.currentNodeId).toEqual(sampleContext.currentNodeId);
      expect(context.nodeState).toEqual(sampleContext.nodeState);
      expect(context.history).toEqual(sampleContext.history);
    });
  });
});
