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

  // Returns next node (can be 'this') or null if end of flow
  async acceptEvent(event: Event): Promise<NodeModel | null> {
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
    // Select next node
    if (conditionTrue) {
      return this.getTargetNodeFromSourceHandle("true");
    } else {
      return this.getTargetNodeFromSourceHandle("false");
    }
  }
}
