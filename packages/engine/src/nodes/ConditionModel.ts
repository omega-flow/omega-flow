import { type Node, type Event } from "@omega-flow/types";

import NodeModel from "./../engine/NodeModel";

import { Engine as RulesEngine } from "json-rules-engine";

export default class ConditionModel extends NodeModel {
  constructor(node: Node) {
    super(node);
  }

  static create(node: Node): ConditionModel {
    if (node.type !== "Condition") {
      throw new Error("Node type must be Condition");
    }
    return new this(node);
  }

  async acceptEvent(event: Event): Promise<boolean> {
    // Crate rule from node data
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

  // Determine next node based on the condition result
  async nextNode(event: Event): Promise<NodeModel | null> {
    const conditionTrue = this.getState().conditionResult;

    // Select next node based on condition result
    if (conditionTrue) {
      return this.getTargetNodeFromSourceHandle("true");
    } else {
      return this.getTargetNodeFromSourceHandle("false");
    }
  }
}
