import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { Edge, Node, Workflow } from "@omega-flow/types";

import { WorkflowEditorProvider } from "../../src/context/WorkflowEditorContext";
import { TranslationProvider } from "../../src/i18n";
import { useEdges } from "../../src/hooks/useEdges";

/**
 * Renders the hook inside the editor providers and returns the edges it hands
 * to ReactFlow. `renderToStaticMarkup` is enough: `useEdges` derives its result
 * during render and needs no canvas or effects.
 */
function readEdges(
  workflow: Workflow,
  translations?: Record<string, string>,
): Edge[] {
  let captured: Edge[] = [];

  function Probe() {
    captured = useEdges().edges;
    return null;
  }

  renderToStaticMarkup(
    <TranslationProvider translations={translations}>
      <WorkflowEditorProvider workflow={workflow}>
        <Probe />
      </WorkflowEditorProvider>
    </TranslationProvider>
  );

  return captured;
}

function workflowOf(nodes: Node[], edges: Edge[]): Workflow {
  return {
    id: "w1",
    name: "Test",
    flow: { nodes, edges },
    options: { frequency: { type: "one_time" } },
  };
}

const condition: Node = {
  id: "cond",
  type: "Condition",
  position: { x: 0, y: 0 },
  data: {},
};

const action: Node = {
  id: "act",
  type: "Action",
  position: { x: 0, y: 100 },
  data: {},
};

const exit: Node = {
  id: "exit",
  type: "Exit",
  position: { x: 0, y: 200 },
  data: {},
};

describe("useEdges branch labels", () => {
  it("names each branch leaving a multi-output node", () => {
    const edges = readEdges(
      workflowOf(
        [condition, action, exit],
        [
          { id: "e1", source: "cond", sourceHandle: "true", target: "act" },
          { id: "e2", source: "cond", sourceHandle: "false", target: "exit" },
        ]
      )
    );

    expect(edges.map((e) => e.label)).toEqual(["True", "False"]);
  });

  it("tints each branch label with its handle color", () => {
    const [yes, no] = readEdges(
      workflowOf(
        [condition, action, exit],
        [
          { id: "e1", source: "cond", sourceHandle: "true", target: "act" },
          { id: "e2", source: "cond", sourceHandle: "false", target: "exit" },
        ]
      )
    );

    expect(yes.labelStyle?.fill).toContain("--of-handle-positive-color");
    expect(no.labelStyle?.fill).toContain("--of-handle-negative-color");
  });

  it("translates branch names through the editor's dictionary", () => {
    const edges = readEdges(
      workflowOf(
        [condition, action],
        [{ id: "e1", source: "cond", sourceHandle: "true", target: "act" }]
      ),
      { "nodes.condition.handleTrue": "Prawda" }
    );

    expect(edges[0].label).toBe("Prawda");
  });

  it("leaves edges from a single-output node unlabelled", () => {
    const edges = readEdges(
      workflowOf(
        [action, exit],
        [{ id: "e1", source: "act", sourceHandle: "output", target: "exit" }]
      )
    );

    expect(edges[0].label).toBeUndefined();
  });

  it("keeps a label the workflow set explicitly", () => {
    const edges = readEdges(
      workflowOf(
        [condition, action],
        [
          {
            id: "e1",
            source: "cond",
            sourceHandle: "true",
            target: "act",
            label: "Approved",
          },
        ]
      )
    );

    expect(edges[0].label).toBe("Approved");
  });

  it("does not write derived labels back into the workflow", () => {
    const edges: Edge[] = [
      { id: "e1", source: "cond", sourceHandle: "true", target: "act" },
    ];

    readEdges(workflowOf([condition, action], edges));

    expect(edges[0].label).toBeUndefined();
  });
});
