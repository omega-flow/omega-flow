import { type Node, type Event } from "@omega-flow/types";

import NodeModel from "./../engine/NodeModel";

import { Engine as RulesEngine } from "json-rules-engine";

/**
 * Node that evaluates conditions and routes to different paths based on the result.
 *
 * ConditionModel uses json-rules-engine to evaluate conditions against event data.
 * It has two output handles: "true" and "false", allowing the workflow to branch
 * based on the condition result.
 *
 * The conditions are configured in the node's data.conditions field using
 * json-rules-engine format.
 *
 * @example
 * ```json
 * {
 *   "id": "condition-1",
 *   "type": "Condition",
 *   "data": {
 *     "conditions": {
 *       "all": [
 *         { "fact": "amount", "operator": "greaterThan", "value": 100 }
 *       ]
 *     }
 *   }
 * }
 * ```
 *
 * @see https://github.com/CacheControl/json-rules-engine for condition syntax
 */
export default class ConditionModel extends NodeModel {
  /**
   * Creates a new ConditionModel instance.
   * @param node - The node definition from the workflow
   */
  constructor(node: Node) {
    super(node);
  }

  /**
   * Factory method to create a ConditionModel with type validation.
   * @param node - The node definition from the workflow
   * @returns A new ConditionModel instance
   * @throws Error if node type is not "Condition"
   */
  static create(node: Node): ConditionModel {
    if (node.type !== "Condition") {
      throw new Error("Node type must be Condition");
    }
    return new this(node);
  }

  /**
   * Evaluates the condition against the event data.
   * Uses json-rules-engine to evaluate the configured conditions.
   * The result is stored in state for use by nextNode().
   * @param event - The event containing data to evaluate against
   * @returns Always returns true (condition is always evaluated)
   */
  async acceptEvent(event: Event): Promise<boolean> {
    // Create rule from node data
    const rule = {
      conditions: this.getData().conditions,
      event: {
        type: "condition-true",
      },
    };
    // Facts from the events
    const facts = event.data;
    // Create rule engine
    let ruleEngine = new RulesEngine();
    // Add rule with success event
    ruleEngine.addRule(rule);
    // Run engine
    const output = await ruleEngine.run(facts);
    // Check output.event for `condition-true`
    const conditionTrue = output.events.find(
      (e) => e.type === "condition-true"
    );
    // Store result in state for nextNode to use
    this.setState({ conditionResult: !!conditionTrue });
    // Accept event if condition is evaluated (always true for now)
    return true;
  }

  /**
   * Returns the next node based on the condition evaluation result.
   * Routes to "true" handle if condition passed, "false" handle otherwise.
   * @param _event - The event being processed (unused)
   * @returns The next NodeModel from the appropriate handle, or null if not connected
   */
  async nextNode(_event: Event): Promise<NodeModel | null> {
    const conditionTrue = this.getState().conditionResult;

    // Select next node based on condition result
    if (conditionTrue) {
      return this.getTargetNodeFromSourceHandle("true");
    } else {
      return this.getTargetNodeFromSourceHandle("false");
    }
  }
}
