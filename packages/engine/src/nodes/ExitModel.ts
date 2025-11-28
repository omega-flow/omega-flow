import { type Node, type Event } from "@omega-flow/types";

import NodeModel from "./../engine/NodeModel";

export default class ExitModel extends NodeModel {
  constructor(node: Node) {
    if (node.type !== "Exit") {
      throw new Error("Node type must be Exit");
    }
    super(node);
  }

  async acceptEvent(event: Event): Promise<boolean> {
    // Accept all events and process immediately
    return true;
  }

  async nextNode(event: Event): Promise<NodeModel | null> {
    // Exit model always returns null to end workflow
    return null;
  }
}
