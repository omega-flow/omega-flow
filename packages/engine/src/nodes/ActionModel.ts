import { type Node, type Event } from "@omega-flow/types";

import NodeModel from "./../engine/NodeModel";

export default class ActionModel extends NodeModel {
  constructor(node: Node) {
    if (node.type !== "Action") {
      throw new Error("Node type must be Action");
    }
    super(node);
  }

  async acceptEvent(event: Event): Promise<boolean> {
    // Accept all events and process immediately
    return true;
  }

  async nextNode(event: Event): Promise<NodeModel | null> {
    const handle = this.getSourceHandles()[0];
    const targetNode = this.getTargetNodeFromSourceHandle(handle);

    return targetNode;
  }
}
