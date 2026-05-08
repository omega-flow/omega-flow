import { type Node, type Event, type Conditions } from "@omega-flow/types";

import NodeModel from "./../engine/NodeModel";
import { evaluateConditions } from "./conditionEvaluator";

/**
 * Node that evaluates conditions and routes to different paths based on the result.
 *
 * The conditions are configured in the node's data.conditions field using the
 * shared `Conditions` format: top-level OR between groups, each group is AND
 * (`all`) or OR (`any`) of leaf rules. The same shape is produced by the
 * editor's visual condition builder, so no conversion is needed at runtime.
 *
 * @example
 * ```json
 * {
 *   "id": "condition-1",
 *   "type": "Condition",
 *   "data": {
 *     "conditions": {
 *       "groups": [
 *         {
 *           "operator": "all",
 *           "conditions": [
 *             { "fact": "amount", "operator": "greaterThan", "value": 100 }
 *           ]
 *         }
 *       ]
 *     }
 *   }
 * }
 * ```
 */
export default class ConditionModel extends NodeModel {
  constructor(node: Node) {
    super(node);
  }

  /**
   * Factory method to create a ConditionModel with type validation.
   */
  static create(node: Node): ConditionModel {
    if (node.type !== "Condition") {
      throw new Error("Node type must be Condition");
    }
    return new this(node);
  }

  /**
   * Evaluates the condition against the event data using the built-in
   * evaluator. The result is stored in state for use by nextNode().
   */
  async acceptEvent(event: Event): Promise<boolean> {
    const conditions = this.getData().conditions as Conditions | undefined;
    const facts = (event.data ?? {}) as Record<string, unknown>;
    const conditionResult = evaluateConditions(conditions, facts);
    this.setState({ conditionResult });
    return true;
  }

  /**
   * Routes to "true" handle if condition passed, "false" handle otherwise.
   */
  async nextNode(_event: Event): Promise<NodeModel | null> {
    const conditionTrue = this.getState().conditionResult;
    if (conditionTrue) {
      return this.getTargetNodeFromSourceHandle("true");
    } else {
      return this.getTargetNodeFromSourceHandle("false");
    }
  }
}
