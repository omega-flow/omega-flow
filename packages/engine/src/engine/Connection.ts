import NodeModel from "./NodeModel";
import EdgeModel from "./EdgeModel";

/**
 * Represents a connection from a source node to a target node via an edge.
 *
 * Connections are stored on the source node and define which target node
 * is reachable through a specific edge. This structure enables nodes to
 * look up their outgoing connections and determine the next node in the workflow.
 */
export type Connection = {
  /** The destination node that this connection leads to */
  targetNode: NodeModel;
  /** The edge that defines this connection, including handle information */
  edge: EdgeModel;
};
