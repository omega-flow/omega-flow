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

    return event.type === nodeData.params.event;
  }

  async processEvent(event: Event): Promise<void> {}

  nextNode(event: Event): NodeModel | null {
    const handle = this.getSourceHandles()[0];
    const targetNode = this.getTargetNodeFromSourceHandle(handle);

    return targetNode;
  }
}
