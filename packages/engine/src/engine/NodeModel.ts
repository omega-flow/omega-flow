import { type Node, type Event } from "@omega-flow/types";

import EdgeModel from "./EdgeModel";
import { type Connection } from "./Connection";

class NodeModel {
  node: Node;
  connections: Connection[];
  state: any;

  constructor(node: Node) {
    if (!node || !node.id) {
      throw new Error("Node must have an id");
    }
    this.node = node;
    this.connections = [];
    this.state = {};
  }

  getId(): string {
    return String(this.node.id);
  }

  getData(): any {
    return this.node.data || {};
  }

  equals(node: NodeModel | null): boolean {
    // Node can be null, when workflow finishes
    if (!node) {
      return false;
    }
    if (node instanceof NodeModel) {
      return this.getId() === node.getId();
    }
    return false;
  }

  getState(): any {
    return this.state;
  }

  setState(state: any) {
    this.state = state;
  }

  // Connects this node to another node
  // this node becomes source node
  connect(targetNode: NodeModel, edge: EdgeModel) {
    if (this.getId() === targetNode.getId()) {
      throw new Error("Cannot connect node to itself");
    }
    // Check if targetNode is already connected
    const sameConnection = this.connections.find(
      (c) => c.targetNode.getId() === targetNode.getId()
    );
    if (sameConnection) {
      const prevEdge = sameConnection.edge;
      // You can connect to the same node only if the source handle is different
      // (e.g. to the same node but different output)
      if (prevEdge.getSourceHandle() === edge.getSourceHandle()) {
        throw new Error("Connection already exists");
      }
    }
    // Add connection
    this.connections.push({
      targetNode,
      edge,
    });
  }

  // Returns all connected nodes
  // returns [{targetNode, edge}, ...]
  getConnections(): Connection[] {
    return this.connections;
  }

  // Return all outputs of this node, as labels (strings)
  getSourceHandles(): string[] {
    return this.connections.map((c) => c.edge.getSourceHandle());
  }

  // Return node that source (output) handle is connected to
  getTargetNodeFromSourceHandle(sourceHandle: string): NodeModel | null {
    const connection = this.connections.find(
      (c) => c.edge.getSourceHandle() === sourceHandle
    );
    if (connection) {
      return connection.targetNode;
    }
    return null;
  }

  // Checks if the node accepts the event
  // Returns true if accepted, false otherwise
  async acceptEvent(event: Event): Promise<boolean> {
    // This method should be overridden by subclasses
    throw new Error("acceptEvent method not implemented");
  }

  // Process the event (after accepting it)
  // Return true if fully processed, false otherwise
  async processEvent(event: Event): Promise<boolean> {
    // This method should be overridden by subclasses
    throw new Error("processEvent method not implemented");
  }

  // TODO: can it return 'this'?
  // Determine next node after processing the event
  // Return next NodeModel or null if workflow should end
  async nextNode(event: Event): Promise<NodeModel | null> {
    // This method should be overridden by subclasses
    throw new Error("nextNode method not implemented");
  }
}

export default NodeModel;
