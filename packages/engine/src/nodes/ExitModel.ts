import { type Node, type Event } from "@omega-flow/types";

import NodeModel from "./../engine/NodeModel";

/**
 * Node that terminates the workflow execution.
 *
 * ExitModel accepts all events and returns null from nextNode(), which signals
 * to the WorkflowModel that the workflow should be marked as completed.
 * Every workflow should have at least one exit node to properly terminate.
 *
 * @example
 * ```json
 * {
 *   "id": "exit-1",
 *   "type": "Exit",
 *   "data": {}
 * }
 * ```
 */
export default class ExitModel extends NodeModel {
  /**
   * Creates a new ExitModel instance.
   * @param node - The node definition from the workflow
   */
  constructor(node: Node) {
    super(node);
  }

  /**
   * Factory method to create an ExitModel with type validation.
   * @param node - The node definition from the workflow
   * @returns A new ExitModel instance
   * @throws Error if node type is not "Exit"
   */
  static create(node: Node): ExitModel {
    if (node.type !== "Exit") {
      throw new Error("Node type must be Exit");
    }
    return new this(node);
  }

  /**
   * Accepts all events immediately.
   * Exit nodes don't filter events - they terminate whenever reached.
   * @param _event - The event being processed (unused)
   * @returns Always returns true (event accepted)
   */
  async acceptEvent(_event: Event): Promise<boolean> {
    // Accept all events and process immediately
    return true;
  }

  /**
   * Always returns null to signal workflow termination.
   * @param _event - The event being processed (unused)
   * @returns Always null, signaling workflow completion
   */
  async nextNode(_event: Event): Promise<NodeModel | null> {
    // Exit model always returns null to end workflow
    return null;
  }
}
