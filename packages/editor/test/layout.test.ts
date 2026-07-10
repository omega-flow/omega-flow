import type { Node, Edge } from "@omega-flow/types";
import { layoutFlow, defaultLayoutOptions } from "../src/utils/layout";
import type { NodeTypeDefinition } from "../src/context/types";

function node(id: string, type = "Action"): Node {
  return { id, type, position: { x: 999, y: 999 }, data: {} };
}

function edge(source: string, target: string, sourceHandle?: string): Edge {
  return { id: `e-${source}-${target}`, source, target, sourceHandle };
}

function positionOf(nodes: Node[], id: string): { x: number; y: number } {
  return nodes.find((n) => n.id === id)!.position;
}

describe("layoutFlow", () => {
  it("returns the input for an empty graph", () => {
    expect(layoutFlow([], [])).toEqual([]);
  });

  it("stacks a chain vertically, centered on the same axis", () => {
    const nodes = [node("a"), node("b"), node("c")];
    const edges = [edge("a", "b"), edge("b", "c")];
    const result = layoutFlow(nodes, edges);

    const [a, b, c] = ["a", "b", "c"].map((id) => positionOf(result, id));
    expect(a.x).toBe(b.x);
    expect(b.x).toBe(c.x);
    expect(a.y).toBeLessThan(b.y);
    expect(b.y).toBeLessThan(c.y);
    // ranks are spaced by node height + rank gap
    expect(b.y - a.y).toBe(
      defaultLayoutOptions.nodeHeight + defaultLayoutOptions.rankGap
    );
  });

  it("places branches side by side and centers the parent", () => {
    const nodes = [node("cond", "Condition"), node("t"), node("f")];
    const edges = [edge("cond", "t", "true"), edge("cond", "f", "false")];
    const result = layoutFlow(nodes, edges);

    const cond = positionOf(result, "cond");
    const t = positionOf(result, "t");
    const f = positionOf(result, "f");

    expect(t.y).toBe(f.y);
    expect(t.x).not.toBe(f.x);
    // parent is centered over its children
    expect(cond.x).toBe((t.x + f.x) / 2);
  });

  it("orders branches by the node type's handle order", () => {
    const conditionDef: NodeTypeDefinition = {
      type: "Condition",
      label: "Condition",
      defaultData: {},
      ViewComponent: (() => null) as never,
      DetailComponent: (() => null) as never,
      sourceHandles: [{ id: "true" }, { id: "false" }],
    };
    const nodeTypes = new Map([["Condition", conditionDef]]);

    const nodes = [node("cond", "Condition"), node("t"), node("f")];
    // false edge inserted first: handle order must still win
    const edges = [edge("cond", "f", "false"), edge("cond", "t", "true")];
    const result = layoutFlow(nodes, edges, nodeTypes);

    expect(positionOf(result, "t").x).toBeLessThan(positionOf(result, "f").x);
  });

  it("lays out left-to-right when direction is LR", () => {
    const nodes = [node("a"), node("b")];
    const edges = [edge("a", "b")];
    const result = layoutFlow(nodes, edges, undefined, { direction: "LR" });

    const a = positionOf(result, "a");
    const b = positionOf(result, "b");
    expect(a.y).toBe(b.y);
    expect(a.x).toBeLessThan(b.x);
  });

  it("lays out disconnected fragments without overlap", () => {
    const nodes = [node("a"), node("b"), node("x")];
    const edges = [edge("a", "b")];
    const result = layoutFlow(nodes, edges);

    const a = positionOf(result, "a");
    const x = positionOf(result, "x");
    expect(a.y).toBe(x.y);
    expect(Math.abs(a.x - x.x)).toBeGreaterThanOrEqual(
      defaultLayoutOptions.nodeWidth + defaultLayoutOptions.nodeGap
    );
  });

  it("uses measured node sizes when available", () => {
    const wide = {
      ...node("wide"),
      measured: { width: 400, height: 70 },
    } as Node;
    const nodes = [wide, node("child")];
    const edges = [edge("wide", "child")];
    const result = layoutFlow(nodes, edges);

    const widePos = positionOf(result, "wide");
    const childPos = positionOf(result, "child");
    // both centered on the same axis despite different widths
    expect(widePos.x + 200).toBe(childPos.x + defaultLayoutOptions.nodeWidth / 2);
  });
});
