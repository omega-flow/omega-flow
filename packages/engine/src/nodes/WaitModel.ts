import { type Node, type Event } from "@omega-flow/types";

import NodeModel from "./../engine/NodeModel";

export default class WaitModel extends NodeModel {
  constructor(node: Node) {
    if (node.type !== "Wait") {
      throw new Error("Node type must be of type Wait");
    }
    super(node);
  }

  isWaiting(): boolean {
    const state = this.getState();
    return state && state.waitStartAt !== undefined;
  }

  startWaiting(time: number) {
    this.setState({ waitStartAt: time });
  }

  waitIsOver(currentTime: number): boolean {
    const state = this.getState();
    const nodeData = this.getData();
    if (!state || state.waitStartAt === undefined) {
      return false;
    }
    const waitDuration = nodeData.duration || 0;
    return currentTime >= state.waitStartAt + waitDuration;
  }

  async acceptEvent(event: Event): Promise<boolean> {
    if (this.isWaiting()) {
      // check time, return time if wait is over
      return this.waitIsOver(event.time);
    } else {
      return true;
    }
  }

  async processEvent(event: Event): Promise<boolean> {
    if (this.isWaiting()) {
      // Wait is over
      return true;
    } else {
      this.startWaiting(event.time);
      // Returns false to indicate that processing  (aka waiting) is not yet complete
      return false;
    }
  }

  async nextNode(event: Event): Promise<NodeModel | null> {
    const handle = this.getSourceHandles()[0];
    const targetNode = this.getTargetNodeFromSourceHandle(handle);

    return targetNode;
  }
}
