import type { Edge, Node } from "@xyflow/react";

export interface Workflow {
  id: string;
  name: string;
  flow: {
    nodes: Node[];
    edges: Edge[];
  };
}

export interface Event {
  id: string;
  time: number;
  type: string;
  data?: any;
}

export interface NodeState {
  [key: string]: any;
}

export interface WorkflowHistoryItem {
  time: number;
  type: "started" | "step" | "completed";
  fromNodeId: string | null;
  toNodeId: string | null;
}

export interface Context {
  workflowId: string;
  currentNodeId: string | null;
  nodeState: NodeState;
  history: WorkflowHistoryItem[];
}

export const WorkflowSchema = {
  type: "object",
  required: ["id", "flow", "options"],
  properties: {
    id: { type: "number" },
    flow: {
      type: "object",
      required: ["nodes", "edges"],
      properties: {
        nodes: {
          type: "array",
          minItems: 1,
        },
        edges: {
          type: "array",
          minItems: 0,
        },
      },
    },
    options: { type: "object" },
  },
};

// Export ReactFlow types
export { Node, Edge };

export function nodeHasType(node: Node): node is Node & { type: string } {
  return node.type !== undefined;
}

// export interface Node {
//   id: string;
//   type: string;
//   data?: any;
//   position: { x: number; y: number };
//   measured: { width: number; height: number };
// }

// export interface Edge {
//   id: string;
//   source: string;
//   target: string;
//   sourceHandle?: string;
//   targetHandle?: string;
// }
