import type { Edge, Node } from "@xyflow/react";

export interface WorkflowFrequency {
  type: "one_time" | "every_rematch";
  interval?: number; // in seconds, for every_rematch type
}

export interface WorkflowOptions {
  frequency?: WorkflowFrequency;
  [key: string]: any;
}

export interface Workflow {
  id: string;
  name: string;
  flow: {
    nodes: Node[];
    edges: Edge[];
  };
  options: WorkflowOptions;
}

export enum WorkflowStatus {
  Idle = "idle",
  Waiting = "waiting",
  Processing = "processing",
  Transforming = "transforming",
  Completed = "completed",
}

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
