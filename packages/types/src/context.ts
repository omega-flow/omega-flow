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
  instanceId: string;
  currentNodeId: string | null;
  nodeState: NodeState;
  history: WorkflowHistoryItem[];
  isCompleted?: boolean;
  startedAt: number;
  /**
   * Optimistic-lock version, managed by persistent WorkflowMemory backends
   * (e.g. DynamoDBWorkflowMemory). Round-tripped through the engine so a
   * conditional write can detect concurrent modification. Absent / `undefined`
   * for in-memory usage and for never-yet-persisted instances.
   */
  version?: number;
}

// Context schema definition
export const ContextSchema = {
  type: "object",
  required: [
    "workflowId",
    "instanceId",
    "currentNodeId",
    "nodeState",
    "history",
    "startedAt",
  ],
  properties: {
    workflowId: { type: "string" },
    instanceId: { type: "string" },
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
    startedAt: { type: "number" },
    version: { type: "number" },
  },
};
