import { type Node, type Event } from "@omega-flow/types";

import NodeModel from "./../engine/NodeModel";

import { Engine as RulesEngine } from "json-rules-engine";

export default class ConditionModel extends NodeModel {
  constructor(node: Node) {
    if (node.type !== "Condition") {
      throw new Error("Node type must be Condition");
    }
    super(node);
  }

  async acceptEvent(event: Event): Promise<boolean> {
    // Condition model accepts all events
    return true;
  }

  // Process state and store results for later use when determining the next node
  async processEvent(event: Event): Promise<boolean> {
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
    // Add facts fetcher
    // ruleEngine.addFact("user", async (params, almanac) => {
    //   const user_id = await almanac.factValue("user_id");
    //   return USERS[user_id];
    // });
    // Run engine
    const output = await ruleEngine.run(facts);
    // Check output.event for `condition-true`
    const conditionTrue = output.events.find(
      (e) => e.type === "condition-true"
    );
    // Store result in state for nextNode to use
    this.setState({ conditionResult: !!conditionTrue });

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
