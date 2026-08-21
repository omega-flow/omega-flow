import { type Node, type Event } from "@omega-flow/types";

import NodeModel from "./../engine/NodeModel";

/**
 * Node that performs an action and immediately proceeds to the next node.
 *
 * ActionModel accepts all events unconditionally and moves to the next node.
 * It represents a step in the workflow that performs some operation (defined
 * in the node's data) and continues without waiting.
 *
 * This node type is useful for:
 * - Sending notifications
 * - Updating external systems
 * - Logging or recording events
 * - Any non-blocking operation
 *
 * @example
 * ```json
 * {
 *   "id": "action-1",
 *   "type": "Action",
 *   "data": {
 *     "action": "sendEmail",
 *     "params": { "to": "user@example.com" }
 *   }
 * }
 * ```
 */
export default class ActionModel extends NodeModel {
  /**
   * Creates a new ActionModel instance.
   * @param node - The node definition from the workflow
   */
  constructor(node: Node) {
    super(node);
  }

  /**
   * Factory method to create an ActionModel with type validation.
   * @param node - The node definition from the workflow
   * @returns A new ActionModel instance
   * @throws Error if node type is not "Action"
   */
  static create(node: Node): ActionModel {
    if (node.type !== "Action") {
      throw new Error("Node type must be Action");
    }
    return new this(node);
  }

  /**
   * Accepts all events immediately.
   * Actions don't filter events - they execute whenever reached.
   *
   * When the node has `data.params`, every `{{path}}` placeholder in them is
   * resolved against the resolution scope (`event.` / `trigger.` / `state.`)
   * and the result is saved to state as `resolvedParams`, so action executors
   * and other nodes consume resolved values instead of raw templates.
   *
   * @param _event - The event being processed (unused)
   * @returns Always returns true (event accepted)
   */
  async acceptEvent(_event: Event): Promise<boolean> {
    if (this.getData().params !== undefined) {
      this.updateState({ resolvedParams: this.resolveParams() });
    }
    // Accept all events and process immediately
    return true;
  }

  /**
   * Returns the next node connected to this action's output.
   * @param _event - The event being processed (unused)
   * @returns The next NodeModel, or null if no connection exists
   */
  async nextNode(_event: Event): Promise<NodeModel | null> {
    return this.getDefaultNext();
  }
}
