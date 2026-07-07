import { type Node, type Event, type Context } from "@omega-flow/types";

import NodeModel, { type SubscriptionRequest } from "../engine/NodeModel";
import { resolveSubscriptionFromParams } from "./subscriptionMatch";

/**
 * Node that waits for a specific event type before proceeding.
 *
 * TriggerModel acts as a start node or checkpoint in a workflow that only
 * accepts events matching the configured event type. This allows workflows
 * to be triggered by specific events from external systems.
 *
 * The trigger event type is configured in the node's data.params.event field.
 *
 * @example
 * ```json
 * {
 *   "id": "trigger-1",
 *   "type": "Trigger",
 *   "data": {
 *     "params": { "event": "order_placed" }
 *   }
 * }
 * ```
 */
export default class TriggerModel extends NodeModel {
  /**
   * Creates a new TriggerModel instance.
   * @param node - The node definition from the workflow
   */
  constructor(node: Node) {
    super(node);
  }

  /**
   * Factory method to create a TriggerModel with type validation.
   * @param node - The node definition from the workflow
   * @returns A new TriggerModel instance
   * @throws Error if node type is not "Trigger"
   */
  static create(node: Node): TriggerModel {
    if (node.type !== "Trigger") {
      throw new Error("Node type must be Trigger");
    }
    return new this(node);
  }

  /**
   * Accepts events that match the configured trigger event type.
   * @param event - The event being processed
   * @returns True if event.type matches the configured params.event, false otherwise
   */
  async acceptEvent(event: Event): Promise<boolean> {
    const nodeData = this.getData();
    // Accept only if event type matches node trigger
    return event.type === nodeData.params.event;
  }

  /**
   * Declares a cross-subject subscription when the node has a
   * `params.match` section (see {@link resolveSubscriptionFromParams}).
   * Without `match`, the trigger only reacts to events arriving in the
   * instance's own subject space, as before.
   * @param context - The instance's context, used to resolve the match value
   * @returns The subscription to register, or null for none
   */
  getSubscription(context: Context): SubscriptionRequest | null {
    return resolveSubscriptionFromParams(
      this.getData().params,
      context,
      this.getId()
    );
  }

  /**
   * Returns the next node connected to this trigger's output.
   * @param _event - The event being processed (unused)
   * @returns The next NodeModel, or null if no connection exists
   */
  async nextNode(_event: Event): Promise<NodeModel | null> {
    return this.getDefaultNext();
  }
}
