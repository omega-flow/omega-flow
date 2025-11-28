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
    const nodeData = this.getData();
    // If event matches trigger, stop waiting and accept
    if (event.type === nodeData.params.event) {
      this.stopWaiting(event.time);
      return true;
    } else if (this.isWaiting()) {
      // Wait is over, stop waiting and accept only if complete
      if (this.isWaitComplete(event.time)) {
        this.stopWaiting(event.time);
        return true;
      }
      // Not complete, stay pending
      return false;
    } else {
      // Start waiting and stay pending
      this.startWaiting(event.time);
      return false;
    }
  }

  async nextNode(event: Event): Promise<NodeModel | null> {
    const handle = this.getSourceHandles()[0];
    const targetNode = this.getTargetNodeFromSourceHandle(handle);

    return targetNode;
  }
}
