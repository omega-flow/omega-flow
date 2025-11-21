import { type Node, type Event } from "@omega-flow/types";

import NodeModel from "./../engine/NodeModel";

export default class SegmentChangeModel extends NodeModel {
  constructor(node: Node) {
    if (node.type !== "SegmentChange") {
      throw new Error("Node type must be SegmentChange");
    }
    super(node);
  }

  acceptEvent(event: Event): boolean {
    // Store whether this event matches our segment change criteria
    if (event.type === "SegmentChange") {
      const eventData = event.data;
      const nodeData = this.getData();

      const isMatch =
        eventData.segment.id === nodeData.segment.id &&
        eventData.change === nodeData.change;

      this.setState({ isMatch });
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
