import { type Node, type Event } from "@omega-flow/types";

import NodeModel from "./../engine/NodeModel";

export default class SegmentChangeModel extends NodeModel {
  constructor(node: Node) {
    if (node.type !== "SegmentChange") {
      throw new Error("Node type must be SegmentChange");
    }
    super(node);
  }

  // Returns next node (can be 'this') or null if end of flow
  async acceptEvent(event: Event): Promise<NodeModel | null> {
    if (event.type === "SegmentChange") {
      const eventData = event.data;
      const nodeData = this.getData();
      if (eventData.segment.id === nodeData.segment.id) {
        if (eventData.change === nodeData.change) {
          const handle = this.getSourceHandles()[0];
          const targetNode = this.getTargetNodeFromSourceHandle(handle);
          if (targetNode) {
            // Return the target node
            return targetNode;
          }
        }
      }
    }

    // No match, return self
    return this;
  }
}
