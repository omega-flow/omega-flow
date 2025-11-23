export interface NodeState {
  [key: string]: any;
}

export interface WorkflowHistoryItem {
  time: number;
  type: "started" | "step" | "completed";
  fromNodeId?: string | null;
  toNodeId?: string | null;
}

export interface Context {
  workflowId: string;
  currentNodeId: string | null;
  nodeState: NodeState;
  history: WorkflowHistoryItem[];
  isCompleted?: boolean;
}

// Context schema definition
export const ContextSchema = {
  type: "object",
  required: ["workflowId", "currentNodeId", "nodeState", "history"],
  properties: {
    workflowId: { type: "string" },
    currentNodeId: { type: ["string", "null"] },
    nodeState: { type: "object" },
    history: {
      type: "array",
      items: {
        type: "object",
        required: ["time", "type"],
        properties: {
          time: { type: "number" },
          type: { type: "string" },
          fromNodeId: { type: ["string", "null"] },
          toNodeId: { type: ["string", "null"] },
        },
      },
    },
    isCompleted: { type: "boolean" },
  },
};
