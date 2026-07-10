export interface Event {
  id: string;
  time: number;
  type: string;
  /**
   * Explicit routing: the domain (tenant) this event belongs to.
   *
   * When both `domain` and `subjectId` are present, the engine routes by them
   * directly and never calls the configured `eventExtractor` — explicit
   * envelope routing always wins over derivation. Set them at ingest (or let
   * the engine set them on delivery copies) and no downstream code re-derives
   * routing from the payload.
   */
  domain?: string;
  /**
   * Explicit routing: the subject this event is addressed to
   * (e.g. `client:5`). See `domain` for the precedence rule.
   */
  subjectId?: string;
  /**
   * Present only on subscription delivery copies (engine-authored):
   * addresses the one instance this copy must resume. Like
   * `domain`/`subjectId`, it lives on the envelope — `data` belongs to the
   * host, so payload contents can never make an ordinary event look like a
   * delivery copy.
   */
  delivery?: EventDelivery;
  data?: any;
}

/**
 * Delivery metadata carried in `event.delivery` on events relayed to a
 * subscriber via an event subscription (cross-subject resume).
 *
 * A delivery event is a copy of the original event, retargeted at one
 * specific workflow instance: `WorkflowManager.processEvent` recognizes it
 * and resumes exactly that instance (targeted `deliverEvent`) instead of
 * running normal routing, which could start unrelated instances.
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
    domain: { type: "string" },
    subjectId: { type: "string" },
    delivery: { type: "object" },
    data: {},
  },
};
