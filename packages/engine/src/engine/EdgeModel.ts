import { type Node, type Edge } from "@omega-flow/types";

/**
 * Represents a connection (edge) between two nodes in a workflow graph.
 *
 * EdgeModel wraps the underlying Edge definition and provides methods
 * to access source and target node information, as well as handle identifiers
 * for connecting specific input/output ports on nodes.
 */
class EdgeModel {
  /** The underlying edge definition from the workflow */
  edge: Edge;

  /**
   * Creates a new EdgeModel instance.
   * @param edge - The edge definition from the workflow
   * @throws Error if edge is missing, has no id, or lacks source/target
   */
  constructor(edge: Edge) {
    if (!edge || !edge.id) {
      throw new Error("Edge must have an id");
    }
    if (!edge.source || !edge.target) {
      throw new Error("Edge must have a source and target");
    }
    this.edge = edge;
  }

  /**
   * Gets the unique identifier of this edge.
   * @returns The edge's ID as a string
   */
  getId(): string {
    return String(this.edge.id);
  }

  /**
   * Gets the ID of the source (origin) node.
   * @returns The source node's ID as a string
   */
  getSourceNodeId(): string {
    return String(this.edge.source);
  }

  /**
   * Gets the source handle identifier (output port).
   * Handles allow nodes to have multiple outputs (e.g., "true"/"false" for conditions).
   * @returns The source handle name, or "_" if not specified
   */
  getSourceHandle(): string {
    return String(this.edge.sourceHandle || "_");
  }

  /**
   * Gets the ID of the target (destination) node.
   * @returns The target node's ID as a string
   */
  getTargetNodeId(): string {
    return String(this.edge.target);
  }

  /**
   * Gets the target handle identifier (input port).
   * @returns The target handle name, or "_" if not specified
   */
  getTargetHandle(): string {
    return String(this.edge.targetHandle || "_");
  }
}

export default EdgeModel;
