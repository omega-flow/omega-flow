// Main types and interfaces
import type { Edge, Node } from "@xyflow/react";

// ReactFlow types
export type { Node, Edge };

export * from "./workflow";
export * from "./event";
export * from "./context";

// Utility functions
export function nodeHasType(node: Node): node is Node & { type: string } {
  return node.type !== undefined;
}
