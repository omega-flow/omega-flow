import { type Node, type Event } from "@omega-flow/types";

import NodeModel from "./../engine/NodeModel";

export default class ExitModel extends NodeModel {
  constructor(node: Node) {
    if (node.type !== "Exit") {
      throw new Error("Node type must be Exit");
    }
    super(node);
  }

  acceptEvent(event: Event): boolean {
    // Exit model accepts all events
    return true;
  }

  async processEvent(event: Event): Promise<void> {
    // No processing needed for exit model
  }

  nextNode(event: Event): NodeModel | null {
    // Exit model always returns null to end workflow
    return null;
  }
}
