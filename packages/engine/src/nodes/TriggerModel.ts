import { type Node, type Event } from "@omega-flow/types";

import NodeModel from "../engine/NodeModel";

export default class TriggerModel extends NodeModel {
  constructor(node: Node) {
    if (node.type !== "Trigger") {
      throw new Error("Node type must be Trigger");
    }
    super(node);
  }

  acceptEvent(event: Event): boolean {
    const eventData = event.data;
    const nodeData = this.getData();

    const isMatch = event.type === nodeData.params.event;

    if (isMatch) {
      this.setState({ isMatch: true });
      return true;
    } else {
      this.setState({ isMatch: false });
      return false;
    }
  }

  async processEvent(event: Event): Promise<void> {}

  nextNode(event: Event): NodeModel | null {
    // Check if the event matched during processing
    const isMatch = this.getState().isMatch;

    if (isMatch) {
      const handle = this.getSourceHandles()[0];
      const targetNode = this.getTargetNodeFromSourceHandle(handle);
      if (targetNode) {
        // Return the target node
        return targetNode;
      }
    }

    // No match, return self
    return this;
  }
}
