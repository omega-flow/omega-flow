import type { Edge, Node } from "@xyflow/react";

export interface Workflow {
  id: string;
  name: string;
  flow: {
    nodes: Node[];
    edges: Edge[];
  };
}

export type WorkflowStatus =
  | "idle"
  | "waiting"
  | "processing"
  | "transforming"
  | "completed";

// Workflow schema definition
export const WorkflowSchema = {
  type: "object",
  required: ["id", "flow", "options"],
  properties: {
    id: { type: "string" },
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
