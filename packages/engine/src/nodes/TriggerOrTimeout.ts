import { type Node, type Event } from "@omega-flow/types";

import NodeModel from "../engine/NodeModel";
import WaitModel from "./WaitModel";

export default class TriggerOrTimeoutModel extends WaitModel {
  constructor(node: Node) {
    if (node.type !== "TriggerOrTimeout") {
      throw new Error("Node type must be TriggerOrTimeout");
    }
    super(node);
  }

  async acceptEvent(event: Event): Promise<boolean> {
    const eventData = event.data;
    const nodeData = this.getData();

    // Check if event matches the trigger event
    if (event.type === nodeData.params.event) {
      return true;
    } else if (this.isWaiting()) {
      return this.isWaitComplete(event.time);
    } else {
      return true;
    }
  }

  async processEvent(event: Event): Promise<boolean> {
    const nodeData = this.getData();

    if (event.type === nodeData.params.event) {
      this.stopWaiting(event.time);
      return true;
    } else if (this.isWaiting()) {
      // Wait is over
      this.stopWaiting(event.time);
      return true;
    } else {
      this.startWaiting(event.time);
      // Returns false to indicate that processing (aka waiting) is not yet complete
      return false;
    }
  }

  async nextNode(event: Event): Promise<NodeModel | null> {
    const handle = this.getSourceHandles()[0];
    const targetNode = this.getTargetNodeFromSourceHandle(handle);

    return targetNode;
  }
}
