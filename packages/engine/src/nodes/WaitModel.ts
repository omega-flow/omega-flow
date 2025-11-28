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
    return state && state.waitStartsAt !== undefined;
  }

  startWaiting(time: number) {
    this.updateState({ waitStartsAt: time });

    // TODO: Trigger scheduler to wake up when wait is over
  }

  stopWaiting(time: number) {
    this.updateState({ waitEndsAt: time });
  }

  isWaitComplete(currentTime: number): boolean {
    if (this.isWaiting()) {
      const state = this.getState();
      const nodeData = this.getData();
      const waitDuration = nodeData.duration || 0;
      return currentTime >= state.waitStartsAt + waitDuration;
    }
    return false;
  }

  async acceptEvent(event: Event): Promise<boolean> {
    if (this.isWaiting()) {
      // Accept the event only if wait is complete
      return this.isWaitComplete(event.time);
    } else {
      // Accept the event to start waiting
      return true;
    }
  }

  async processEvent(event: Event): Promise<boolean> {
    if (this.isWaiting()) {
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
