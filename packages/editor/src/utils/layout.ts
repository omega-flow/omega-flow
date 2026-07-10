import type { Node, Edge } from "@omega-flow/types";
import type { LayoutOptions, NodeTypeDefinition } from "../context/types";
import { getSourceHandles } from "./graph";

export const defaultLayoutOptions: Required<LayoutOptions> = {
  direction: "TB",
  rankGap: 60,
  nodeGap: 40,
  nodeWidth: 180,
  nodeHeight: 70,
};

interface MeasuredNode extends Node {
  measured?: { width?: number; height?: number };
  width?: number;
  height?: number;
}

function nodeSize(
  node: MeasuredNode,
  options: Required<LayoutOptions>
): { width: number; height: number } {
  return {
    width: node.measured?.width ?? node.width ?? options.nodeWidth,
    height: node.measured?.height ?? node.height ?? options.nodeHeight,
  };
}

/**
 * Recomputes node positions with a layered tree layout (trigger at the top,
 * children below, siblings side by side, parents centered over their
 * subtrees). Pure: returns new node objects, does not mutate the input.
 *
 * Nodes reachable from multiple parents (merges) are placed under the first
 * parent that reaches them. Disconnected fragments are laid out side by side.
 * Outgoing edges are ordered by the node type's `sourceHandles` order when
 * `nodeTypes` is provided (so e.g. a Condition's "true" branch stays left of
 * "false"), falling back to edge insertion order.
 */
export function layoutFlow(
  nodes: Node[],
  edges: Edge[],
  nodeTypes?: Map<string, NodeTypeDefinition>,
  options?: LayoutOptions
): Node[] {
  if (nodes.length === 0) return nodes;
  const opts = { ...defaultLayoutOptions, ...options };
  const horizontal = opts.direction === "LR";

  const nodeById = new Map(nodes.map((n) => [n.id, n as MeasuredNode]));

  // Children per node, ordered by the type's source-handle order when known
  const childrenOf = new Map<string, string[]>();
  for (const node of nodes) {
    const outgoing = edges.filter(
      (e) => e.source === node.id && nodeById.has(e.target)
    );
    const definition = node.type ? nodeTypes?.get(node.type) : undefined;
    if (definition) {
      const handleOrder = getSourceHandles(definition).map((h) => h.id);
      outgoing.sort((a, b) => {
        const ai = handleOrder.indexOf(a.sourceHandle ?? "");
        const bi = handleOrder.indexOf(b.sourceHandle ?? "");
        return (ai === -1 ? handleOrder.length : ai) -
          (bi === -1 ? handleOrder.length : bi);
      });
    }
    childrenOf.set(
      node.id,
      outgoing.map((e) => e.target)
    );
  }

  // Roots: nodes without incoming edges; fall back to the first node when the
  // graph is a pure cycle so we always lay out something.
  const targeted = new Set(
    edges.filter((e) => nodeById.has(e.source)).map((e) => e.target)
  );
  let roots = nodes.filter((n) => !targeted.has(n.id)).map((n) => n.id);
  if (roots.length === 0) roots = [nodes[0].id];

  // Along the main axis (y in TB): rank = depth from root, position = sum of
  // max node size per rank. Across (x in TB): leaves take consecutive slots,
  // parents center over their children.
  const placed = new Set<string>();
  const crossPos = new Map<string, number>();
  const rankOf = new Map<string, number>();
  let cursor = 0;

  const place = (id: string, rank: number): { min: number; max: number } => {
    placed.add(id);
    rankOf.set(id, Math.max(rankOf.get(id) ?? 0, rank));
    const children = (childrenOf.get(id) ?? []).filter(
      (c) => !placed.has(c)
    );
    const size = nodeSize(nodeById.get(id)!, opts);
    const extent = horizontal ? size.height : size.width;

    if (children.length === 0) {
      const center = cursor + extent / 2;
      cursor += extent + opts.nodeGap;
      crossPos.set(id, center);
      return { min: center, max: center };
    }

    let min = Infinity;
    let max = -Infinity;
    for (const child of children) {
      const span = place(child, rank + 1);
      min = Math.min(min, span.min);
      max = Math.max(max, span.max);
    }
    const center = (min + max) / 2;
    crossPos.set(id, center);
    return { min: center, max: center };
  };

  for (const root of roots) {
    if (!placed.has(root)) place(root, 0);
  }
  // Fragments only reachable through already-placed nodes are covered above;
  // anything still unplaced (unreachable cycles) keeps its position.

  // Main-axis offsets: each rank is as tall as its tallest node.
  const rankExtent = new Map<number, number>();
  for (const id of placed) {
    const size = nodeSize(nodeById.get(id)!, opts);
    const extent = horizontal ? size.width : size.height;
    const rank = rankOf.get(id)!;
    rankExtent.set(rank, Math.max(rankExtent.get(rank) ?? 0, extent));
  }
  const rankOffset = new Map<number, number>();
  let mainCursor = 0;
  const maxRank = Math.max(...[...rankExtent.keys()], 0);
  for (let rank = 0; rank <= maxRank; rank++) {
    rankOffset.set(rank, mainCursor);
    mainCursor += (rankExtent.get(rank) ?? 0) + opts.rankGap;
  }

  return nodes.map((node) => {
    if (!placed.has(node.id)) return node;
    const size = nodeSize(nodeById.get(node.id)!, opts);
    const main = rankOffset.get(rankOf.get(node.id)!)!;
    const cross = crossPos.get(node.id)!;
    const position = horizontal
      ? { x: main, y: cross - size.height / 2 }
      : { x: cross - size.width / 2, y: main };
    return { ...node, position };
  });
}
