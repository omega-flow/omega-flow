import { NodeModel } from "@omega-flow/engine";
import type { Node, Event } from "@omega-flow/types";

const NODE_TYPE = "StoreTrigger";

interface StoreTriggerParams {
  action?: string;
}

export default class StoreTriggerModel extends NodeModel {
  constructor(node: Node) {
    super(node);
  }

  static create(node: Node): StoreTriggerModel {
    if (node.type !== NODE_TYPE) {
      throw new Error(`Node type must be ${NODE_TYPE}`);
    }
    return new this(node);
  }

  async acceptEvent(event: Event): Promise<boolean> {
    const params = (this.getData().params || {}) as StoreTriggerParams;
    if (!params.action) {
      return false;
    }
    return event.type === params.action;
  }

  async nextNode(_event: Event): Promise<NodeModel | null> {
    return this.getDefaultNext();
  }
}
