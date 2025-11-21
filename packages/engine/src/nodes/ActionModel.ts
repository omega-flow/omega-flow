import { type Node, type Event } from "@omega-flow/types";

import NodeModel from "./../engine/NodeModel";

export default class ActionModel extends NodeModel {
  constructor(node: Node) {
    if (node.type !== "Action") {
      throw new Error("Node type must be Action");
    }
    super(node);
  }

  acceptEvent(event: Event): boolean {
    // In this simple implementation, accept all events
    return true;
  }

  async processEvent(event: Event): Promise<void> {
    // No processing needed for this model
  }

  nextNode(event: Event): NodeModel | null {
    // Action model always returns null (exits workflow)
    return null;
  }
}
