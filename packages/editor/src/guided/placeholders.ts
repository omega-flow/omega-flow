import type { Node, Edge } from "@omega-flow/types";
import type { NodeTypeDefinition, PendingInsertion } from "../context/types";
import { getSourceHandles } from "../utils/graph";
import {
  PLACEHOLDER_NODE_TYPE,
  PLACEHOLDER_WIDTH,
  PLACEHOLDER_HEIGHT,
  placeholderNodeId,
} from "./constants";

export interface PlaceholderNodeData {
  insertion: PendingInsertion;
  [key: string]: unknown;
}

/**
 * Derives the virtual "Add node" placeholders for a flow: one per unconnected
 * source handle, or a single "choose a trigger" placeholder for an empty
 * canvas. Purely computed — placeholders never enter the editor state or the
 * persisted workflow.
 */
export function derivePlaceholders(
  nodes: Node[],
  edges: Edge[],
  nodeTypes: Map<string, NodeTypeDefinition>
): { nodes: Node[]; edges: Edge[] } {
  if (nodes.length === 0) {
    const insertion: PendingInsertion = { kind: "root" };
    return {
      nodes: [
        {
          id: placeholderNodeId(insertion),
          type: PLACEHOLDER_NODE_TYPE,
          position: { x: 0, y: 0 },
          data: { insertion } satisfies PlaceholderNodeData,
          width: PLACEHOLDER_WIDTH,
          height: PLACEHOLDER_HEIGHT,
          draggable: false,
          connectable: false,
          selectable: false,
          // ReactFlow disables pointer events on non-selectable, non-draggable
          // nodes; re-enable them so the placeholder stays clickable
          style: { pointerEvents: "all" },
        } as Node,
      ],
      edges: [],
    };
  }

  const placeholderNodes: Node[] = [];
  const placeholderEdges: Edge[] = [];

  for (const node of nodes) {
    const definition = node.type ? nodeTypes.get(node.type) : undefined;
    const handles = getSourceHandles(definition);
    const outgoing = edges.filter((e) => e.source === node.id);

    for (const handle of handles) {
      // Single-handle nodes may have edges without an explicit sourceHandle
      // (older data); any outgoing edge occupies the only handle.
      const occupied =
        handles.length === 1
          ? outgoing.length > 0
          : outgoing.some((e) => e.sourceHandle === handle.id);
      if (occupied) continue;

      const insertion: PendingInsertion = {
        kind: "after",
        sourceNodeId: node.id,
        sourceHandleId: handle.id,
      };
      const id = placeholderNodeId(insertion);
      placeholderNodes.push({
        id,
        type: PLACEHOLDER_NODE_TYPE,
        position: { x: 0, y: 0 },
        data: { insertion } satisfies PlaceholderNodeData,
        width: PLACEHOLDER_WIDTH,
        height: PLACEHOLDER_HEIGHT,
        draggable: false,
        connectable: false,
        selectable: false,
        // ReactFlow disables pointer events on non-selectable, non-draggable
        // nodes; re-enable them so the placeholder stays clickable
        style: { pointerEvents: "all" },
      } as Node);
      placeholderEdges.push({
        id: `${id}:edge`,
        source: node.id,
        target: id,
        sourceHandle: handle.id,
        // Placeholder edges are visual only: dashed, no "+" button
        data: { placeholder: true },
      } as Edge);
    }
  }

  return { nodes: placeholderNodes, edges: placeholderEdges };
}
