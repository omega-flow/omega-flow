export interface Event {
  id: string;
  time: number;
  type: string;
  data?: any;
}

/**
 * Delivery metadata carried in `event.data.delivery` on events relayed to a
 * subscriber via an event subscription (cross-subject resume).
 *
 * A delivery event is a copy of the original event, retargeted at one
 * specific workflow instance: it must resume exactly that instance (via
 * `WorkflowManager.deliverEvent`) and never be routed through the normal
 * `processEvent` matching, which could start unrelated instances.
 */
export interface EventDelivery {
  /** Workflow the subscribing instance belongs to */
  workflowId: string;
  /** Instance that registered the subscription */
  instanceId: string;
  /** The parked node that declared the subscription */
  nodeId: string;
  /** Subject id the original event was routed to (e.g. `product:456`) */
  sourceSubjectId: string;
}

// Event schema definition
export const EventSchema = {
  type: "object",
  required: ["id", "time", "type"],
  properties: {
    id: { type: "string" },
    time: { type: "number" },
    type: { type: "string" },
    data: {},
  },
};
