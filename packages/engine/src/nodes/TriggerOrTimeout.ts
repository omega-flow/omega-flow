import { type Node, type Event, type Context } from "@omega-flow/types";

import NodeModel, { type SubscriptionRequest } from "../engine/NodeModel";
import WaitModel from "./WaitModel";
import { resolveSubscriptionFromParams } from "./subscriptionMatch";

/**
 * Node that waits for either a specific event or a timeout, whichever comes first.
 *
 * TriggerOrTimeoutModel extends WaitModel to add event-based triggering.
 * It will proceed when either:
 * 1. A matching event arrives (configured in params.event) — routes via the `trigger` source handle
 * 2. The timeout duration elapses (configured in params.duration) — routes via the `timeout` source handle
 *
 * This is useful for scenarios like:
 * - "Wait for payment confirmation or timeout after 24 hours"
 * - "Wait for user action or proceed automatically after delay"
 *
 * @example
 * ```json
 * {
 *   "id": "trigger-or-timeout-1",
 *   "type": "TriggerOrTimeout",
 *   "data": {
 *     "params": {
 *       "event": "payment_received",
 *       "duration": 86400000
 *     }
 *   }
 * }
 * ```
 */
export default class TriggerOrTimeoutModel extends WaitModel {
  /**
   * Creates a new TriggerOrTimeoutModel instance.
   * @param node - The node definition from the workflow
   */
  constructor(node: Node) {
    super(node);
  }

  /**
   * Factory method to create a TriggerOrTimeoutModel with type validation.
   * @param node - The node definition from the workflow
   * @returns A new TriggerOrTimeoutModel instance
   * @throws Error if node type is not "TriggerOrTimeout"
   */
  static create(node: Node): TriggerOrTimeoutModel {
    if (node.type !== "TriggerOrTimeout") {
      throw new Error("Node type must be TriggerOrTimeout");
    }
    return new this(node);
  }

  /**
   * Processes events, accepting either a matching trigger event or timeout completion.
   * - If event type matches params.event: Records `resolvedBy: "trigger"` and accepts
   * - If already waiting and timeout elapsed: Records `resolvedBy: "timeout"` and accepts
   * - If not waiting: Starts waiting and returns false
   * @param event - The event being processed
   * @returns True if event matches trigger or timeout completed, false if still waiting
   */
  async acceptEvent(event: Event): Promise<boolean> {
    const nodeData = this.getData();
    // If event matches trigger, stop waiting and accept
    if (event.type === nodeData.params.event) {
      this.stopWaiting(event.time);
      this.updateState({ resolvedBy: "trigger" });
      return true;
    } else if (this.isWaiting()) {
      // Wait is over, stop waiting and accept only if complete
      if (this.isWaitComplete(event.time)) {
        this.stopWaiting(event.time);
        this.updateState({ resolvedBy: "timeout" });
        return true;
      }
      // Not complete, stay pending
      return false;
    } else {
      // Start waiting and stay pending
      await this.startWaiting(event.time, event.data);
      return false;
    }
  }

  /**
   * Declares a cross-subject subscription when the node has a
   * `params.match` section (see {@link resolveSubscriptionFromParams}).
   * The subscription's TTL safety net is derived from `params.duration`,
   * since the timeout bounds how long the wait can be pending.
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
   * Routes execution to the `trigger` source handle if the matching event
   * resolved the wait, or the `timeout` source handle if the duration elapsed.
   * @param _event - The event being processed (unused)
   * @returns The next NodeModel, or null if no connection exists for the resolved handle
   */
  async nextNode(_event: Event): Promise<NodeModel | null> {
    const { resolvedBy } = this.getState();
    return this.getTargetNodeFromSourceHandle(resolvedBy);
  }
}
