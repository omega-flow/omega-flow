import { type Node, type Event } from "@omega-flow/types";

import NodeModel from "../engine/NodeModel";

export default class TriggerModel extends NodeModel {
  constructor(node: Node) {
    super(node);
  }

  static create(node: Node): TriggerModel {
    if (node.type !== "Trigger") {
      throw new Error("Node type must be Trigger");
    }
    return new this(node);
  }

  async acceptEvent(event: Event): Promise<boolean> {
    const nodeData = this.getData();
    // Accept only if event type matches node trigger
    return event.type === nodeData.params.event;
  }

  async nextNode(event: Event): Promise<NodeModel | null> {
    const handle = this.getSourceHandles()[0];
    const targetNode = this.getTargetNodeFromSourceHandle(handle);

    return targetNode;
  }
}
