import type { Node, Edge } from "@omega-flow/types";
import {
  getSourceHandles,
  insertNodeAfter,
  insertNodeOnEdge,
  removeNodeWithHealing,
} from "../src/utils/graph";
import type { NodeTypeDefinition } from "../src/context/types";

function node(id: string, type = "Action"): Node {
  return { id, type, position: { x: 0, y: 0 }, data: {} };
}

function edge(
  source: string,
  target: string,
  sourceHandle?: string,
  targetHandle?: string
): Edge {
  return { id: `e-${source}-${target}`, source, target, sourceHandle, targetHandle };
}

function ids(items: Array<{ id: string }>): string[] {
  return items.map((i) => i.id).sort();
}

function connections(edges: Edge[]): string[] {
  return edges.map((e) => `${e.source}(${e.sourceHandle ?? ""})->${e.target}`).sort();
}

describe("getSourceHandles", () => {
  const base = {
    label: "x",
    defaultData: {},
    ViewComponent: (() => null) as never,
    DetailComponent: (() => null) as never,
  };

  it("returns explicit sourceHandles when set", () => {
    const def: NodeTypeDefinition = {
      ...base,
      type: "Condition",
      sourceHandles: [{ id: "true" }, { id: "false" }],
    };
    expect(getSourceHandles(def).map((h) => h.id)).toEqual(["true", "false"]);
  });

  it("returns no handles for terminal types", () => {
    const def: NodeTypeDefinition = { ...base, type: "Exit", role: "terminal" };
    expect(getSourceHandles(def)).toEqual([]);
  });

  it("defaults to a single output handle", () => {
    const def: NodeTypeDefinition = { ...base, type: "Custom" };
    expect(getSourceHandles(def).map((h) => h.id)).toEqual(["output"]);
    expect(getSourceHandles(undefined).map((h) => h.id)).toEqual(["output"]);
  });
});

describe("insertNodeAfter", () => {
  it("adds the node and connects it from the given handle", () => {
    const graph = { nodes: [node("a")], edges: [] as Edge[] };
    const result = insertNodeAfter(graph, "a", "true", node("b"));

    expect(ids(result.nodes)).toEqual(["a", "b"]);
    expect(result.edges).toHaveLength(1);
    expect(result.edges[0]).toMatchObject({
      source: "a",
      target: "b",
      sourceHandle: "true",
    });
  });
});

describe("insertNodeOnEdge", () => {
  it("splits A->C into A->B->C preserving handles", () => {
    const graph = {
      nodes: [node("a"), node("c")],
      edges: [edge("a", "c", "false", "input")],
    };
    const result = insertNodeOnEdge(graph, "e-a-c", node("b"), "output");

    expect(ids(result.nodes)).toEqual(["a", "b", "c"]);
    expect(connections(result.edges)).toEqual([
      "a(false)->b",
      "b(output)->c",
    ]);
    const downstream = result.edges.find((e) => e.source === "b")!;
    expect(downstream.targetHandle).toBe("input");
  });

  it("returns the graph unchanged for an unknown edge", () => {
    const graph = { nodes: [node("a")], edges: [] as Edge[] };
    expect(insertNodeOnEdge(graph, "nope", node("b"), "output")).toBe(graph);
  });
});

describe("removeNodeWithHealing", () => {
  it("heals a chain: removing B from A->B->C reconnects A->C", () => {
    const graph = {
      nodes: [node("a"), node("b"), node("c")],
      edges: [edge("a", "b", "output"), edge("b", "c", "output", "input")],
    };
    const result = removeNodeWithHealing(graph, "b");

    expect(ids(result.nodes)).toEqual(["a", "c"]);
    expect(connections(result.edges)).toEqual(["a(output)->c"]);
    expect(result.edges[0].targetHandle).toBe("input");
  });

  it("preserves the predecessor's source handle when healing", () => {
    // condition -true-> action -> exit; removing the action keeps true branch
    const graph = {
      nodes: [node("cond", "Condition"), node("act"), node("exit", "Exit")],
      edges: [edge("cond", "act", "true"), edge("act", "exit", "output")],
    };
    const result = removeNodeWithHealing(graph, "act");
    expect(connections(result.edges)).toEqual(["cond(true)->exit"]);
  });

  it("drops incoming edges when the removed node has no outputs", () => {
    const graph = {
      nodes: [node("a"), node("b")],
      edges: [edge("a", "b", "output")],
    };
    const result = removeNodeWithHealing(graph, "b");
    expect(ids(result.nodes)).toEqual(["a"]);
    expect(result.edges).toEqual([]);
  });

  it("keeps the first branch and drops the other subtree for branching nodes", () => {
    // a -> cond; cond -true-> t1 -> t2; cond -false-> f1
    const graph = {
      nodes: [
        node("a"),
        node("cond", "Condition"),
        node("t1"),
        node("t2"),
        node("f1"),
      ],
      edges: [
        edge("a", "cond", "output"),
        edge("cond", "t1", "true"),
        edge("cond", "f1", "false"),
        edge("t1", "t2", "output"),
      ],
    };
    const result = removeNodeWithHealing(graph, "cond");

    expect(ids(result.nodes)).toEqual(["a", "t1", "t2"]);
    expect(connections(result.edges)).toEqual([
      "a(output)->t1",
      "t1(output)->t2",
    ]);
  });

  it("keeps dropped-branch nodes that are still reachable from elsewhere", () => {
    // diamond: cond -true-> t1 -> join, cond -false-> join
    const graph = {
      nodes: [node("a"), node("cond", "Condition"), node("t1"), node("join")],
      edges: [
        edge("a", "cond", "output"),
        edge("cond", "t1", "true"),
        edge("cond", "join", "false"),
        edge("t1", "join", "output"),
      ],
    };
    const result = removeNodeWithHealing(graph, "cond");

    expect(ids(result.nodes)).toEqual(["a", "join", "t1"]);
    expect(connections(result.edges)).toEqual([
      "a(output)->t1",
      "t1(output)->join",
    ]);
  });

  it("preserves disconnected fragments built in freeform mode", () => {
    const graph = {
      nodes: [node("a"), node("b"), node("x"), node("y")],
      edges: [edge("a", "b", "output"), edge("x", "y", "output")],
    };
    const result = removeNodeWithHealing(graph, "b");
    expect(ids(result.nodes)).toEqual(["a", "x", "y"]);
    expect(connections(result.edges)).toEqual(["x(output)->y"]);
  });

  it("promotes the first child subtree when removing a root", () => {
    const graph = {
      nodes: [node("trigger", "Trigger"), node("b"), node("c")],
      edges: [edge("trigger", "b", "output"), edge("b", "c", "output")],
    };
    const result = removeNodeWithHealing(graph, "trigger");
    expect(ids(result.nodes)).toEqual(["b", "c"]);
    expect(connections(result.edges)).toEqual(["b(output)->c"]);
  });

  it("returns the graph unchanged for an unknown node", () => {
    const graph = { nodes: [node("a")], edges: [] as Edge[] };
    expect(removeNodeWithHealing(graph, "nope")).toBe(graph);
  });
});
