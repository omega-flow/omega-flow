import { type Node, type Event } from "@omega-flow/types";

import NodeModel from "./../engine/NodeModel";

export default class ExitModel extends NodeModel {
  constructor(node: Node) {
    if (node.type !== "Exit") {
      throw new Error("Node type must be Exit");
    }
    super(node);
  }

  // Returns next node (can be 'this') or null if end of flow
  async acceptEvent(event: Event): Promise<NodeModel | null> {
    return null;
  }
}
