import { type Node, type Event } from "@omega-flow/types";

import EdgeModel from "./EdgeModel";
import { type Connection } from "./Connection";
import type { NodeServices } from "./NodeServices";

/**
 * Base class for all workflow node types.
 *
 * NodeModel represents a single step in a workflow graph. Each node can accept events,
 * process them, and determine which node should be executed next. Subclasses must
 * implement the `acceptEvent` and `nextNode` methods to define their specific behavior.
 *
 * When a workflow is on a node, that node is waiting for events (not yet processed).
 * Processing happens when an event is accepted by the node.
 *
 * @example
 * ```typescript
 * class MyCustomNode extends NodeModel {
 *   async acceptEvent(event: Event): Promise<boolean> {
 *     // Return true if event is accepted and processing is complete
 *     return event.type === 'my-event';
 *   }
 *
 *   async nextNode(event: Event): Promise<NodeModel | null> {
 *     return this.getTargetNodeFromSourceHandle('output');
 *   }
 * }
 * ```
 */
class NodeModel {
  /**
   * Factory method to create a new NodeModel instance.
   * Subclasses should override this method to perform type validation.
   * @param node - The node definition from the workflow
   * @returns A new NodeModel instance
   */
  static create(node: Node): NodeModel {
    return new this(node);
  }

  /** The underlying node definition from the workflow */
  node: Node;

  /** List of outgoing connections to other nodes */
  connections: Connection[];

  /** Internal state that persists across event processing. Use setState/getState to access. */
  state: any;

  /** Services available to nodes (scheduler, etc.) */
  services: NodeServices = {};

  /**
   * Creates a new NodeModel instance.
   * @param node - The node definition from the workflow
   * @throws Error if node is missing or doesn't have an id
   */
  constructor(node: Node) {
    if (!node || !node.id) {
      throw new Error("Node must have an id");
    }
    this.node = node;
    this.connections = [];
    this.state = {};
  }

  /**
   * Gets the unique identifier of this node.
   * @returns The node's ID as a string
   */
  getId(): string {
    return String(this.node.id);
  }

  /**
   * Gets the data payload associated with this node.
   * This typically contains node-specific configuration like parameters.
   * @returns The node's data object, or an empty object if not defined
   */
  getData(): any {
    return this.node.data || {};
  }

  /**
   * Checks if this node is equal to another node by comparing IDs.
   * @param node - The node to compare against (can be null)
   * @returns True if the nodes have the same ID, false otherwise
   */
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

  /**
   * Gets the current internal state of the node.
   * State is used to share data between `acceptEvent` and `nextNode` methods.
   * @returns The current state object
   */
  getState(): any {
    return this.state;
  }

  /**
   * Replaces the entire internal state of the node.
   * @param state - The new state object
   */
  setState(state: any) {
    this.state = state;
  }

  /**
   * Merges changes into the existing state (shallow merge).
   * @param changes - Object containing state properties to update
   */
  updateState(changes: any) {
    this.state = {
      ...this.state,
      ...changes,
    };
  }

  /**
   * Connects this node to a target node via an edge.
   * This node becomes the source node of the connection.
   * @param targetNode - The node to connect to
   * @param edge - The edge defining the connection
   * @throws Error if attempting to connect node to itself
   * @throws Error if connection already exists with the same source handle
   */
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

  /**
   * Returns all outgoing connections from this node.
   * @returns Array of Connection objects containing targetNode and edge
   */
  getConnections(): Connection[] {
    return this.connections;
  }

  /**
   * Returns all source handle identifiers (output labels) for this node.
   * Source handles define the different output paths from this node.
   * @returns Array of source handle strings
   */
  getSourceHandles(): string[] {
    return this.connections.map((c) => c.edge.getSourceHandle());
  }

  /**
   * Finds the target node connected to a specific source handle.
   * @param sourceHandle - The source handle (output) identifier to look up
   * @returns The connected NodeModel, or null if no connection exists for the handle
   */
  getTargetNodeFromSourceHandle(sourceHandle: string): NodeModel | null {
    const connection = this.connections.find(
      (c) => c.edge.getSourceHandle() === sourceHandle
    );
    if (connection) {
      return connection.targetNode;
    }
    return null;
  }

  /**
   * Returns the target node connected to the first source handle, or null
   * if this node has no outgoing connections.
   *
   * Most pass-through nodes (single output) implement `nextNode` as
   * `return this.getDefaultNext();`. Use it instead of repeating the
   * `getSourceHandles()[0]` lookup by hand.
   */
  getDefaultNext(): NodeModel | null {
    const handle = this.getSourceHandles()[0];
    if (!handle) {
      return null;
    }
    return this.getTargetNodeFromSourceHandle(handle);
  }

  /**
   * Accepts and processes an incoming event.
   *
   * This method must be overridden by subclasses to define how the node
   * handles events. The method can be called multiple times for the same
   * logical operation (e.g., start wait, then complete wait).
   *
   * @param event - The event to process
   * @returns Promise resolving to true if event is accepted and processing is complete,
   *          false if the node is still waiting or doesn't accept the event
   * @throws Error if not implemented by subclass
   */
  async acceptEvent(_event: Event): Promise<boolean> {
    // This method should be overridden by subclasses
    throw new Error("acceptEvent method not implemented");
  }

  /**
   * Determines the next node to execute after processing an event.
   *
   * This method must be overridden by subclasses. It is called after
   * `acceptEvent` returns true to determine where the workflow should go next.
   *
   * @param event - The event that was processed
   * @returns Promise resolving to the next NodeModel to execute,
   *          or null if the workflow should end
   * @throws Error if not implemented by subclass
   */
  async nextNode(_event: Event): Promise<NodeModel | null> {
    // This method should be overridden by subclasses
    throw new Error("nextNode method not implemented");
  }
}

export default NodeModel;
