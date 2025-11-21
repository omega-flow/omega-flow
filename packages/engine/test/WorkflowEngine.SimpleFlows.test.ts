// @ts-nocheck
import WorkflowModel from "./../src/engine/WorkflowModel";
import { Event } from "@omega-flow/types";
import nodeTypes from "./../src/nodes";

let simpleWorkflow;
let simpleContext;

//        +--------------------+
//        | (1) SegmentChange  |
//        +--------------------+
//                  |
//                  v
//        +--------------------+
//        | (2) Condition      |
//        +--------------------+
//             /              \
//          (T)/               \(F)
//           /                  \
//          v                    v
// +----------------+    +----------------+
// |     Exit (4)   |<---|     Action (3) |
// +----------------+    +----------------+

describe("WorkflowModel", () => {
  beforeEach(() => {
    simpleWorkflow = {
      id: 1,
      flow: {
        nodes: [
          {
            id: "1",
            type: "SegmentChange",
            data: {
              label: "Trigger",
              segment: {
                id: 1,
              },
              change: "new",
            },
            position: { x: 0, y: -50 },
            measured: { width: 0, height: 36 },
          },
          {
            id: "2",
            type: "Condition",
            data: {
              label: "if user is men",
              conditions: {
                // json-rules-engine conditions
                all: [
                  {
                    fact: "user_id",
                    operator: "equal",
                    value: 1,
                  },
                ],
              },
            },
            position: { x: 0, y: 50 },
            measured: { width: 150, height: 36 },
          },
          {
            id: "3",
            type: "Action",
            data: { label: "Node 3" },
            position: { x: 0, y: 100 },
            measured: { width: 150, height: 36 },
          },
          {
            id: "4",
            type: "Exit",
            data: { label: "Node 2" },
            position: { x: 0, y: 150 },
            measured: { width: 150, height: 36 },
          },
        ],
        edges: [
          { id: "e1d-2", source: "1", target: "2" },
          { id: "e2t-4", source: "2", sourceHandle: "true", target: "4" },
          { id: "e2f-3", source: "2", sourceHandle: "false", target: "3" },
          { id: "e3d-4", source: "3", target: "4" },
        ],
        viewport: {
          x: 484.74631195103916,
          y: 189.61067224968303,
          zoom: 0.5486659687896216,
        },
      },
      options: {},
    };

    simpleContext = {
      workflowId: 1,
      currentNodeId: "2",
      nodeState: {
        1: { data: {} },
        2: { data: {} },
      },
      history: [
        {
          time: 123456789,
          type: "event",
          event: {},
        },
        {
          time: 123456789,
          type: "step",
          nodeId: 1,
          data: {},
        },
      ],
    };
  });

  describe("Simple flow", () => {
    it("should start", async () => {
      const workflow = new WorkflowModel(simpleWorkflow, nodeTypes);
      workflow.start();
      expect(workflow.getCurrentNode().getId()).toBe("1");
      expect(workflow.status).toBe("waiting");
    });

    // 1 > 1
    it("should start and NOT accept event as trigger", async () => {
      const workflow = new WorkflowModel(simpleWorkflow, nodeTypes);
      workflow.start();
      // Should be undefined sice we have not loaded any state
      expect(workflow.getCurrentNode().getId()).toBe("1");
      // This event match first node
      const eventNotMatchFirstNode: Event = {
        id: "1",
        type: "SegmentChange",
        time: Date.now(),
        data: {
          user_id: 1,
          segment: { id: 2 }, // wrong segment id
          change: "new",
        },
      };
      await workflow.acceptEvent(eventNotMatchFirstNode);
      expect(workflow.getCurrentNode().getId()).toBe("1");
      expect(workflow.getContext().history.length).toEqual(0);
    });

    // 1 > 2 (condition met) > 4 (exit)
    it("should start and accept event as trigger", async () => {
      const workflow = new WorkflowModel(simpleWorkflow, nodeTypes);
      workflow.start();
      // Should be undefined sice we have not loaded any state
      expect(workflow.getCurrentNode().getId()).toBe("1");
      // This event match first node
      const eventMatchFirstNode: Event = {
        id: "1",
        type: "SegmentChange",
        time: Date.now(),
        data: {
          user_id: 1,
          segment: { id: 1 }, // proper segment id
          change: "new",
        },
      };
      await workflow.acceptEvent(eventMatchFirstNode);
      // here it goes to condition
      // then condition is met and goes to next node which is exit (4)
      expect(workflow.getCurrentNode().getId()).toBe("4");
      // console.log(workflow.getContext().history);
      expect(workflow.getContext().history.length).toEqual(4);
    });
  });
});
