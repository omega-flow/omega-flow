import type { Event } from "./event";

export interface NodeState {
  [key: string]: any;
}

/**
 * An active event subscription recorded on the Context.
 *
 * The Context is the source of truth for which subscriptions a workflow
 * instance currently holds in the SubscriptionStore: when the instance
 * advances past (or completes on) the node that declared a subscription,
 * the WorkflowManager deletes exactly these entries from the store.
 */
export interface ContextSubscription {
  /** Event type the instance is waiting for (e.g. `product.update`) */
  eventType: string;
  /**
   * Subject id of the source event the instance is waiting for
   * (e.g. `product:456`), or `"*"` for a wildcard subscription that matches
   * any subject in the event type's space.
   */
  matchValue: string;
  /** Id of the parked node that declared the subscription */
  nodeId: string;
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
  /**
   * The event that started this workflow instance. Captured when the start
   * node fires, so later nodes can resolve values from it (e.g. a
   * cross-subject subscription's `match.value` template like
   * `product:{{trigger.payload.products[0].product_id}}`).
   */
  triggerEvent?: Event;
  /**
   * Active event subscriptions held by this instance in the
   * SubscriptionStore. Managed by the WorkflowManager (registered when the
   * instance parks on a node that declares one, deleted when it advances).
   */
  subscriptions?: ContextSubscription[];
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
    triggerEvent: {
      type: "object",
      required: ["id", "time", "type"],
      properties: {
        id: { type: "string" },
        time: { type: "number" },
        type: { type: "string" },
        data: {},
      },
    },
    subscriptions: {
      type: "array",
      items: {
        type: "object",
        required: ["eventType", "matchValue", "nodeId"],
        properties: {
          eventType: { type: "string" },
          matchValue: { type: "string" },
          nodeId: { type: "string" },
        },
      },
    },
  },
};
