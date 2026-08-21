// @ts-nocheck
import { Event } from "@omega-flow/types";
import WorkflowModel from "../../src/engine/WorkflowModel";
import nodeTypes from "../../src/nodes";

// Dynamic values: nodes reference other nodes' state, the current event and
// the trigger event via `state.` / `event.` / `trigger.` paths — in condition
// facts, condition values ({{...}} templates) and action params.

describe("WorkflowModel Dynamic Values", () => {
  // 1 Trigger("start") → 2 Action → 3 Condition → true: 4 Exit / false: 5 Exit
  function sameEventWorkflow(conditions) {
    return {
      id: "dyn-1",
      flow: {
        nodes: [
          {
            id: "1",
            type: "Trigger",
            data: { params: { event: "start" } },
            position: { x: 0, y: 0 },
          },
          {
            id: "2",
            type: "Action",
            data: {
              name: "fetch",
              action: "fetchData",
              params: { x: "{{event.x}}", label: "item-{{event.x}}" },
            },
            position: { x: 0, y: 50 },
          },
          {
            id: "3",
            type: "Condition",
            data: { conditions },
            position: { x: 0, y: 100 },
          },
          { id: "4", type: "Exit", data: {}, position: { x: 0, y: 150 } },
          { id: "5", type: "Exit", data: {}, position: { x: 50, y: 150 } },
        ],
        edges: [
          { id: "e1-2", source: "1", target: "2" },
          { id: "e2-3", source: "2", target: "3" },
          { id: "e3t-4", source: "3", sourceHandle: "true", target: "4" },
          { id: "e3f-5", source: "3", sourceHandle: "false", target: "5" },
        ],
      },
      options: {},
    };
  }

  function exitTaken(workflow) {
    const steps = workflow.getContext().history;
    const last = steps[steps.length - 1];
    expect(last.type).toBe("completed");
    return steps[steps.length - 2].toNodeId;
  }

  it("action resolves params from the current event and condition reads them in the same chain", async () => {
    const workflow = new WorkflowModel(
      sameEventWorkflow({
        groups: [
          {
            operator: "all",
            conditions: [
              // Action state written earlier in this event's chain, by node id
              {
                fact: "state.2.resolvedParams.x",
                operator: "equal",
                value: 7,
              },
              {
                fact: "state.2.resolvedParams.label",
                operator: "equal",
                value: "item-7",
              },
            ],
          },
        ],
      }),
      nodeTypes
    );
    workflow.start();

    const event: Event = {
      id: "1",
      type: "start",
      time: Date.now(),
      data: { x: 7 },
    };
    await workflow.acceptEvent(event);

    expect(workflow.getContext().isCompleted).toBe(true);
    // Typed resolution: {{event.x}} stays a number
    expect(workflow.getContext().nodeState["2"].resolvedParams).toEqual({
      x: 7,
      label: "item-7",
    });
    expect(exitTaken(workflow)).toBe("4");
  });

  // 1 Trigger("start") → 2 Action("fetch") → 3 Trigger("next") → 4 Condition
  //   → true: 5 Exit / false: 6 Exit
  function crossEventWorkflow(conditions) {
    return {
      id: "dyn-2",
      flow: {
        nodes: [
          {
            id: "1",
            type: "Trigger",
            data: { params: { event: "start" } },
            position: { x: 0, y: 0 },
          },
          {
            id: "2",
            type: "Action",
            data: {
              name: "fetch",
              action: "fetchData",
              params: { sku: "{{event.sku}}", price: "{{event.price}}" },
            },
            position: { x: 0, y: 50 },
          },
          {
            id: "3",
            type: "Trigger",
            data: { name: "resume", params: { event: "next" } },
            position: { x: 0, y: 100 },
          },
          {
            id: "4",
            type: "Condition",
            data: { conditions },
            position: { x: 0, y: 150 },
          },
          { id: "5", type: "Exit", data: {}, position: { x: 0, y: 200 } },
          { id: "6", type: "Exit", data: {}, position: { x: 50, y: 200 } },
        ],
        edges: [
          { id: "e1-2", source: "1", target: "2" },
          { id: "e2-3", source: "2", target: "3" },
          { id: "e3-4", source: "3", target: "4" },
          { id: "e4t-5", source: "4", sourceHandle: "true", target: "5" },
          { id: "e4f-6", source: "4", sourceHandle: "false", target: "6" },
        ],
      },
      options: {},
    };
  }

  const crossEventConditions = {
    groups: [
      {
        operator: "all",
        conditions: [
          // State written while processing the FIRST event, read on the second
          {
            fact: "state.2.resolvedParams.price",
            operator: "greaterThan",
            value: 40,
          },
          // Trigger event data (first event), even though the current event differs
          { fact: "trigger.sku", operator: "equal", value: "X1" },
          // Current event data via explicit prefix
          { fact: "event.kind", operator: "equal", value: "gold" },
          // Legacy unprefixed fact: still the current event's data
          { fact: "kind", operator: "equal", value: "gold" },
          // Dynamic value: compare current event against another node's state
          {
            fact: "event.price",
            operator: "equal",
            value: "{{state.2.resolvedParams.price}}",
          },
        ],
      },
    ],
  };

  it("resolves state/trigger/event facts across events and a persistence round-trip", async () => {
    const first = new WorkflowModel(
      crossEventWorkflow(crossEventConditions),
      nodeTypes
    );
    first.start();
    await first.acceptEvent({
      id: "1",
      type: "start",
      time: Date.now(),
      data: { sku: "X1", price: 42 },
    });

    // Parked on the second trigger, action params resolved and typed
    expect(first.getCurrentNode().getId()).toBe("3");
    expect(first.getContext().nodeState["2"].resolvedParams).toEqual({
      sku: "X1",
      price: 42,
    });

    // Round-trip through persistence (context only), then resume
    const context = JSON.parse(JSON.stringify(first.getContext()));
    const second = new WorkflowModel(
      crossEventWorkflow(crossEventConditions),
      nodeTypes
    );
    second.setContext(context);
    second.start();
    await second.acceptEvent({
      id: "2",
      type: "next",
      time: Date.now(),
      data: { kind: "gold", price: 42 },
    });

    expect(second.getContext().isCompleted).toBe(true);
    expect(exitTaken(second)).toBe("5");
  });

  it("takes the false path when a dynamic fact does not match", async () => {
    const workflow = new WorkflowModel(
      crossEventWorkflow(crossEventConditions),
      nodeTypes
    );
    workflow.start();
    await workflow.acceptEvent({
      id: "1",
      type: "start",
      time: Date.now(),
      data: { sku: "X1", price: 42 },
    });
    await workflow.acceptEvent({
      id: "2",
      type: "next",
      time: Date.now(),
      data: { kind: "silver", price: 42 },
    });

    expect(workflow.getContext().isCompleted).toBe(true);
    expect(exitTaken(workflow)).toBe("6");
  });

  it("does not bind node names in the state scope — ids are the only reference", async () => {
    // The Action is named "fetch", but names are display-only: a
    // state.fetch.… fact resolves to nothing and takes the false path,
    // so renaming a node can never break (or fix) a template.
    const workflow = new WorkflowModel(
      sameEventWorkflow({
        groups: [
          {
            operator: "all",
            conditions: [
              {
                fact: "state.fetch.resolvedParams.x",
                operator: "equal",
                value: 7,
              },
            ],
          },
        ],
      }),
      nodeTypes
    );
    workflow.start();
    await workflow.acceptEvent({
      id: "1",
      type: "start",
      time: Date.now(),
      data: { x: 7 },
    });

    expect(workflow.getContext().isCompleted).toBe(true);
    expect(exitTaken(workflow)).toBe("5");
  });
});
