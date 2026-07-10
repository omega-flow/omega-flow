import type { Node, Edge } from "@omega-flow/types";
import type { HandleDefinition, NodeTypeDefinition } from "../context/types";
import { generateEdgeId } from "./ids";

export interface FlowGraph {
  nodes: Node[];
  edges: Edge[];
}

/**
 * Returns the source handles of a node type as guided mode sees them:
 * the explicit `sourceHandles` when set, none for `terminal` types,
 * and a single default `output` handle otherwise.
 */
export function getSourceHandles(
  definition: NodeTypeDefinition | undefined
): HandleDefinition[] {
  if (!definition) return [{ id: "output" }];
  if (definition.sourceHandles) return definition.sourceHandles;
  if (definition.role === "terminal") return [];
  return [{ id: "output" }];
}

/**
 * Inserts `newNode` connected after `sourceNodeId` from `sourceHandleId`.
 */
export function insertNodeAfter(
  graph: FlowGraph,
  sourceNodeId: string,
  sourceHandleId: string | undefined,
  newNode: Node
): FlowGraph {
  const edge: Edge = {
    id: generateEdgeId(sourceNodeId, newNode.id),
    source: sourceNodeId,
    target: newNode.id,
    sourceHandle: sourceHandleId,
  };
  return {
    nodes: [...graph.nodes, newNode],
    edges: [...graph.edges, edge],
  };
}

/**
 * Inserts `newNode` in the middle of an existing edge: A→C becomes A→B→C.
 * The original edge keeps its source side (including `sourceHandle`) and is
 * re-targeted to the new node; `newNodeSourceHandleId` (the new node's first
 * output) feeds the original target. Returns the graph unchanged when the
 * edge does not exist.
 */
export function insertNodeOnEdge(
  graph: FlowGraph,
  edgeId: string,
  newNode: Node,
  newNodeSourceHandleId: string | undefined
): FlowGraph {
  const edge = graph.edges.find((e) => e.id === edgeId);
  if (!edge) return graph;

  const upstream: Edge = {
    ...edge,
    id: generateEdgeId(edge.source, newNode.id),
    target: newNode.id,
    targetHandle: undefined,
  };
  const downstream: Edge = {
    id: generateEdgeId(newNode.id, edge.target),
    source: newNode.id,
    target: edge.target,
    sourceHandle: newNodeSourceHandleId,
    targetHandle: edge.targetHandle,
  };

  return {
    nodes: [...graph.nodes, newNode],
    edges: graph.edges.flatMap((e) =>
      e.id === edgeId ? [upstream, downstream] : [e]
    ),
  };
}

/**
 * Removes a node while keeping the flow connected (guided-mode delete).
 *
 * For deleted node B, each incoming edge A→B is re-targeted to B's first
 * outgoing target (preserving A's `sourceHandle`), so A→B→C becomes A→C.
 * When B has no outgoing edges the incoming edges are simply dropped and A's
 * output becomes unconnected again. When B has multiple outgoing edges (e.g.
 * a Condition), only the first branch is kept; subtrees left unreachable by
 * the removal are dropped so the canvas never shows orphaned fragments.
 * Disconnected fragments that already existed (freeform-built flows) are
 * preserved.
 */
export function removeNodeWithHealing(
  graph: FlowGraph,
  nodeId: string
): FlowGraph {
  const node = graph.nodes.find((n) => n.id === nodeId);
  if (!node) return graph;

  const incoming = graph.edges.filter((e) => e.target === nodeId);
  const outgoing = graph.edges.filter((e) => e.source === nodeId);
  const untouched = graph.edges.filter(
    (e) => e.source !== nodeId && e.target !== nodeId
  );
  const keptBranch = outgoing[0];

  const healed: Edge[] = keptBranch
    ? incoming.map((e) => ({
        ...e,
        id: generateEdgeId(e.source, keptBranch.target),
        target: keptBranch.target,
        targetHandle: keptBranch.targetHandle,
      }))
    : [];

  const edges = [...untouched, ...healed];

  // Drop subtrees that only the removed node (or its discarded branches)
  // reached: everything that is not a descendant of the removed node survives,
  // and descendants survive only if still reachable from a survivor. When the
  // removed node was itself a root, its kept branch takes its place.
  const descendants = new Set<string>();
  const descendantQueue = [nodeId];
  while (descendantQueue.length > 0) {
    const current = descendantQueue.shift()!;
    for (const e of graph.edges) {
      if (e.source === current && !descendants.has(e.target)) {
        descendants.add(e.target);
        descendantQueue.push(e.target);
      }
    }
  }

  const seeds = graph.nodes
    .filter((n) => n.id !== nodeId && !descendants.has(n.id))
    .map((n) => n.id);
  if (incoming.length === 0 && keptBranch) {
    seeds.push(keptBranch.target);
  }

  const reachable = new Set(seeds);
  const queue = [...seeds];
  while (queue.length > 0) {
    const current = queue.shift()!;
    for (const e of edges) {
      if (e.source === current && !reachable.has(e.target)) {
        reachable.add(e.target);
        queue.push(e.target);
      }
    }
  }

  return {
    nodes: graph.nodes.filter((n) => n.id !== nodeId && reachable.has(n.id)),
    edges: edges.filter(
      (e) => reachable.has(e.source) && reachable.has(e.target)
    ),
  };
}
