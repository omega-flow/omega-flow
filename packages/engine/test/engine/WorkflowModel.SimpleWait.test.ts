// @ts-nocheck
import { Event } from "@omega-flow/types";
import WorkflowModel from "../../src/engine/WorkflowModel";
import nodeTypes from "../../src/nodes";

let simpleWorkflow;
let simpleContext;

describe("WorkflowModel Simple Wait", () => {
  describe("Simple wait", () => {
    beforeEach(() => {
      // 1 (Trigger) > 2 (Wait 10s) > 3 (Action) > 4 (Exit)
      simpleWorkflow = {
        id: "1",
        flow: {
          nodes: [
            {
              id: "1",
              type: "Trigger",
              data: {
                label: "Sample Trigger",
                params: {
                  event: "sample",
                },
              },
              position: { x: 0, y: -50 },
              measured: { width: 0, height: 36 },
            },
            {
              id: "2",
              type: "Wait",
              data: {
                params: {
                  duration: 10,
                },
              },
              position: { x: 0, y: 50 },
              measured: { width: 150, height: 36 },
            },
            {
              id: "3",
              type: "Action",
              data: { label: "Action label" },
              position: { x: 0, y: 100 },
              measured: { width: 150, height: 36 },
            },
            {
              id: "4",
              type: "Exit",
              data: { label: "Exit Label" },
              position: { x: 0, y: 150 },
              measured: { width: 150, height: 36 },
            },
          ],
          edges: [
            { id: "e1d-2", source: "1", target: "2" },
            { id: "e2d-3", source: "2", target: "3" },
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
    });

    it("should start", async () => {
      const workflow = new WorkflowModel(simpleWorkflow, nodeTypes);
      workflow.start();
      expect(workflow.getCurrentNode().getId()).toBe("1");
      expect(workflow.status).toBe("waiting");
    });

    // 1 > 2 (wait) > 3 > 4
    it("should start, get proper timeout and exit", async () => {
      const workflow = new WorkflowModel(simpleWorkflow, nodeTypes);
      workflow.start();
      // Should be undefined sice we have not loaded any state
      expect(workflow.getCurrentNode().getId()).toBe("1");
      // This event match first node
      const eventMatchFirstNode: Event = {
        id: "1",
        type: "sample",
        time: 100,
        data: {
          user_id: 1,
        },
      };
      await workflow.acceptEvent(eventMatchFirstNode);
      // should be stopped on wait node
      expect(workflow.getCurrentNode().getId()).toBe("2");
      expect(workflow.getStatus()).toBe("waiting");
      // Send some timeout event
      const timeoutEvent: Event = {
        id: "1",
        type: "timeout",
        time: 200, // this is 100s later (wait is only for 10s)
      };
      await workflow.acceptEvent(timeoutEvent);
      // it should pass wait node
      // it should pass action node
      // it should be on exit node and stop
      expect(workflow.getCurrentNode().getId()).toBe("4");
      expect(workflow.getStatus()).toBe("completed");
    });

    // 1 > 2 (wait) >
    it("should start, get wrong timeout", async () => {
      const workflow = new WorkflowModel(simpleWorkflow, nodeTypes);
      workflow.start();
      // Should be undefined sice we have not loaded any state
      expect(workflow.getCurrentNode().getId()).toBe("1");
      // This event match first node
      const eventMatchFirstNode: Event = {
        id: "1",
        type: "sample",
        time: 100,
        data: {
          user_id: 1,
        },
      };
      await workflow.acceptEvent(eventMatchFirstNode);
      // should be stopped on wait node
      expect(workflow.getCurrentNode().getId()).toBe("2");
      expect(workflow.getStatus()).toBe("waiting");
      // Send some timeout event
      const timeoutEvent: Event = {
        id: "1",
        type: "timeout",
        time: 105, // this is just 10s later (wait is for 10s)
      };
      await workflow.acceptEvent(timeoutEvent);
      expect(workflow.getCurrentNode().getId()).toBe("2");
      expect(workflow.getStatus()).toBe("waiting");
    });
  });

  describe("Simple Trigger or Timeout", () => {
    beforeEach(() => {
      // 1 (TriggerOrTimeout (10s))
      //   ─ trigger ─> 2 (Action) > 3 (Exit)
      //   ─ timeout ─> 4 (Action) > 5 (Exit)
      simpleWorkflow = {
        id: "1",
        flow: {
          nodes: [
            {
              id: "1",
              type: "TriggerOrTimeout",
              data: {
                label: "Sample Trigger",
                params: {
                  duration: 10,
                  event: "sample",
                },
              },
              position: { x: 0, y: -50 },
              measured: { width: 0, height: 36 },
            },
            {
              id: "2",
              type: "Action",
              data: { label: "Trigger Action" },
              position: { x: -100, y: 100 },
              measured: { width: 150, height: 36 },
            },
            {
              id: "3",
              type: "Exit",
              data: { label: "Trigger Exit" },
              position: { x: -100, y: 150 },
              measured: { width: 150, height: 36 },
            },
            {
              id: "4",
              type: "Action",
              data: { label: "Timeout Action" },
              position: { x: 100, y: 100 },
              measured: { width: 150, height: 36 },
            },
            {
              id: "5",
              type: "Exit",
              data: { label: "Timeout Exit" },
              position: { x: 100, y: 150 },
              measured: { width: 150, height: 36 },
            },
          ],
          edges: [
            { id: "e1-2", source: "1", sourceHandle: "trigger", target: "2" },
            { id: "e2-3", source: "2", target: "3" },
            { id: "e1-4", source: "1", sourceHandle: "timeout", target: "4" },
            { id: "e4-5", source: "4", target: "5" },
          ],
          viewport: {
            x: 484.74631195103916,
            y: 189.61067224968303,
            zoom: 0.5486659687896216,
          },
        },
        options: {},
      };
    });

    it("should start", async () => {
      const workflow = new WorkflowModel(simpleWorkflow, nodeTypes);
      workflow.start();
      expect(workflow.getCurrentNode().getId()).toBe("1");
      expect(workflow.status).toBe("waiting");
    });

    // 1 (wait) ─ timeout ─> 4 > 5
    it("should start, and continue on timeout", async () => {
      const workflow = new WorkflowModel(simpleWorkflow, nodeTypes);
      workflow.start();
      // Should be undefined sice we have not loaded any state
      expect(workflow.getCurrentNode().getId()).toBe("1");
      // This event not match first node
      const otherEvent: Event = {
        id: "1",
        type: "other",
        time: 100,
        data: {
          user_id: 1,
        },
      };
      await workflow.acceptEvent(otherEvent);
      // should be stopped on wait node
      expect(workflow.getCurrentNode().getId()).toBe("1");
      expect(workflow.getStatus()).toBe("waiting");
      // Send some timeout event
      const timeoutEvent: Event = {
        id: "1",
        type: "timeout",
        time: 200, // this is 100s later (wait is only for 10s)
      };
      await workflow.acceptEvent(timeoutEvent);
      // it should route via the "timeout" handle, pass action node 4
      // and end on exit node 5
      expect(workflow.getCurrentNode().getId()).toBe("5");
      expect(workflow.getStatus()).toBe("completed");
    });

    // 1 (wait) ─ trigger ─> 2 > 3
    it("should start, and continue on event", async () => {
      const workflow = new WorkflowModel(simpleWorkflow, nodeTypes);
      workflow.start();
      // Should be undefined sice we have not loaded any state
      expect(workflow.getCurrentNode().getId()).toBe("1");
      // This event match first node
      const otherEvent: Event = {
        id: "1",
        type: "other",
        time: 100,
        data: {
          user_id: 1,
        },
      };
      await workflow.acceptEvent(otherEvent);
      // should be stopped on wait node
      expect(workflow.getCurrentNode().getId()).toBe("1");
      expect(workflow.getStatus()).toBe("waiting");
      // Send matching event
      const sampleEvent: Event = {
        id: "1",
        type: "sample",
        time: 105,
      };
      await workflow.acceptEvent(sampleEvent);
      // it should route via the "trigger" handle, pass action node 2
      // and end on exit node 3
      expect(workflow.getCurrentNode().getId()).toBe("3");
      expect(workflow.getStatus()).toBe("completed");
    });

    it("should start, and still wait for timeout", async () => {
      const workflow = new WorkflowModel(simpleWorkflow, nodeTypes);
      workflow.start();
      // Should be undefined sice we have not loaded any state
      expect(workflow.getCurrentNode().getId()).toBe("1");
      // This event not match first node
      const otherEvent: Event = {
        id: "1",
        type: "other",
        time: 100,
        data: {
          user_id: 1,
        },
      };
      await workflow.acceptEvent(otherEvent);
      // should be stopped on wait node
      expect(workflow.getCurrentNode().getId()).toBe("1");
      expect(workflow.getStatus()).toBe("waiting");
      // This event not match first node
      const otherEvent2: Event = {
        id: "2",
        type: "other",
        time: 105, //only 5 seconds later, timeout is set to 10
        data: {
          user_id: 1,
        },
      };
      await workflow.acceptEvent(otherEvent2);
      // should be stopped on wait node
      expect(workflow.getCurrentNode().getId()).toBe("1");
      expect(workflow.getStatus()).toBe("waiting");
    });
  });
});
