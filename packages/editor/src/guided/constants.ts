import type { PendingInsertion } from "../context/types";

/** Reserved ReactFlow node type key for "Add node" placeholders */
export const PLACEHOLDER_NODE_TYPE = "of-add-node";

/** Reserved ReactFlow edge type key for guided-mode edges */
export const INSERTABLE_EDGE_TYPE = "of-insertable";

const PLACEHOLDER_PREFIX = "of-placeholder:";

/** Default on-canvas size of a placeholder (also used by the layout) */
export const PLACEHOLDER_WIDTH = 150;
export const PLACEHOLDER_HEIGHT = 44;

export function placeholderNodeId(insertion: PendingInsertion): string {
  if (insertion.kind === "after") {
    return `${PLACEHOLDER_PREFIX}${insertion.sourceNodeId}:${insertion.sourceHandleId ?? ""}`;
  }
  return `${PLACEHOLDER_PREFIX}root`;
}

export function isPlaceholderId(id: string): boolean {
  return id.startsWith(PLACEHOLDER_PREFIX);
}
