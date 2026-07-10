import type { Node, Edge } from "@omega-flow/types";
import { derivePlaceholders } from "../src/guided/placeholders";
import { isPlaceholderId, PLACEHOLDER_NODE_TYPE } from "../src/guided/constants";
import type { NodeTypeDefinition } from "../src/context/types";

const base = {
  label: "x",
  defaultData: {},
  ViewComponent: (() => null) as never,
  DetailComponent: (() => null) as never,
};

const nodeTypes = new Map<string, NodeTypeDefinition>([
  ["Trigger", { ...base, type: "Trigger", role: "trigger", sourceHandles: [{ id: "output" }] }],
  ["Action", { ...base, type: "Action", sourceHandles: [{ id: "output" }] }],
  [
    "Condition",
    { ...base, type: "Condition", sourceHandles: [{ id: "true" }, { id: "false" }] },
  ],
  ["Exit", { ...base, type: "Exit", role: "terminal" }],
]);

function node(id: string, type: string): Node {
  return { id, type, position: { x: 0, y: 0 }, data: {} };
}

function edge(source: string, target: string, sourceHandle?: string): Edge {
  return { id: `e-${source}-${target}`, source, target, sourceHandle };
}

describe("derivePlaceholders", () => {
  it("offers a single root placeholder for an empty canvas", () => {
    const result = derivePlaceholders([], [], nodeTypes);
    expect(result.nodes).toHaveLength(1);
    expect(result.nodes[0].type).toBe(PLACEHOLDER_NODE_TYPE);
    expect(result.nodes[0].data).toMatchObject({ insertion: { kind: "root" } });
    expect(result.edges).toHaveLength(0);
  });

  it("adds a placeholder per unconnected source handle", () => {
    const nodes = [node("t", "Trigger"), node("c", "Condition")];
    const edges = [edge("t", "c", "output"), edge("c", "x", "true")];
    const result = derivePlaceholders(nodes, edges, nodeTypes);

    // only the condition's "false" handle is unconnected
    expect(result.nodes).toHaveLength(1);
    expect(result.nodes[0].data).toMatchObject({
      insertion: { kind: "after", sourceNodeId: "c", sourceHandleId: "false" },
    });
    expect(result.edges).toHaveLength(1);
    expect(result.edges[0]).toMatchObject({
      source: "c",
      sourceHandle: "false",
      target: result.nodes[0].id,
    });
    expect(isPlaceholderId(result.nodes[0].id)).toBe(true);
  });

  it("treats any outgoing edge as occupying a single-handle node", () => {
    // legacy edge without an explicit sourceHandle
    const nodes = [node("t", "Trigger"), node("a", "Action")];
    const edges = [{ ...edge("t", "a"), sourceHandle: undefined }];
    const result = derivePlaceholders(nodes, edges, nodeTypes);

    // trigger occupied; action's output is free
    expect(result.nodes).toHaveLength(1);
    expect(result.nodes[0].data).toMatchObject({
      insertion: { kind: "after", sourceNodeId: "a" },
    });
  });

  it("keeps placeholders clickable despite being non-selectable", () => {
    // ReactFlow sets pointer-events: none on non-selectable, non-draggable
    // nodes unless the node style re-enables them
    const empty = derivePlaceholders([], [], nodeTypes).nodes[0] as Node & {
      style?: { pointerEvents?: string };
    };
    expect(empty.style?.pointerEvents).toBe("all");

    const after = derivePlaceholders(
      [node("a", "Action")],
      [],
      nodeTypes
    ).nodes[0] as Node & { style?: { pointerEvents?: string } };
    expect(after.style?.pointerEvents).toBe("all");
  });

  it("adds no placeholder after terminal nodes", () => {
    const nodes = [node("t", "Trigger"), node("e", "Exit")];
    const edges = [edge("t", "e", "output")];
    const result = derivePlaceholders(nodes, edges, nodeTypes);
    expect(result.nodes).toHaveLength(0);
  });
});
