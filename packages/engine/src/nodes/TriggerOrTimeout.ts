import { type Node, type Event } from "@omega-flow/types";

import NodeModel from "../engine/NodeModel";
import WaitModel from "./WaitModel";

/**
 * Node that waits for either a specific event or a timeout, whichever comes first.
 *
 * TriggerOrTimeoutModel extends WaitModel to add event-based triggering.
 * It will proceed when either:
 * 1. A matching event arrives (configured in params.event)
 * 2. The timeout duration elapses (configured in params.duration)
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
   * - If event type matches params.event: Immediately accepts
   * - If already waiting and timeout elapsed: Accepts
   * - If not waiting: Starts waiting and returns false
   * @param event - The event being processed
   * @returns True if event matches trigger or timeout completed, false if still waiting
   */
  async acceptEvent(event: Event): Promise<boolean> {
    const nodeData = this.getData();
    // If event matches trigger, stop waiting and accept
    if (event.type === nodeData.params.event) {
      this.stopWaiting(event.time);
      return true;
    } else if (this.isWaiting()) {
      // Wait is over, stop waiting and accept only if complete
      if (this.isWaitComplete(event.time)) {
        this.stopWaiting(event.time);
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
   * Returns the next node connected to this node's output.
   * @param _event - The event being processed (unused)
   * @returns The next NodeModel, or null if no connection exists
   */
  async nextNode(_event: Event): Promise<NodeModel | null> {
    const handle = this.getSourceHandles()[0];
    const targetNode = this.getTargetNodeFromSourceHandle(handle);

    return targetNode;
  }
}
