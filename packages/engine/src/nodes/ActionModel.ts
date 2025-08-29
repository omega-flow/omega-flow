import { type Node, type Event } from "@omega-flow/types";

import NodeModel from "./../engine/NodeModel";

export default class ActionModel extends NodeModel {
  constructor(node: Node) {
    if (node.type !== "Action") {
      throw new Error("Node type must be Action");
    }
    super(node);
  }

  // Returns next node (can be 'this') or null if end of flow
  async acceptEvent(event: Event): Promise<NodeModel | null> {
    return null;
  }
}
