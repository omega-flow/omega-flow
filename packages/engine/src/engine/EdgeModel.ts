import { type Node, type Edge } from "@omega-flow/types";

class EdgeModel {
  edge: Edge;

  constructor(edge: Edge) {
    if (!edge || !edge.id) {
      throw new Error("Edge must have an id");
    }
    if (!edge.source || !edge.target) {
      throw new Error("Edge must have a source and target");
    }
    this.edge = edge;
  }

  getId(): string {
    return String(this.edge.id);
  }

  getSourceNodeId(): string {
    return String(this.edge.source);
  }

  getSourceHandle(): string {
    return String(this.edge.sourceHandle || "_");
  }

  getTargetNodeId(): string {
    return String(this.edge.target);
  }

  getTargetHandle(): string {
    return String(this.edge.targetHandle || "_");
  }
}

export default EdgeModel;
