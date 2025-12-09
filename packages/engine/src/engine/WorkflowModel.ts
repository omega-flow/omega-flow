import Ajv from "ajv";

import {
  type Workflow,
  type Context,
  type NodeState,
  type Event,
  type Node,
  type WorkflowHistoryItem,
  WorkflowStatus,
  WorkflowSchema,
  ContextSchema,
  EventSchema,
} from "@omega-flow/types";

import NodeModel from "./NodeModel";
import EdgeModel from "./EdgeModel";

/**
 * Core workflow execution engine that manages the lifecycle of a single workflow instance.
 *
 * WorkflowModel takes a workflow definition (graph of nodes and edges) and executes it
 * by processing events and moving through nodes. It maintains execution state including
 * the current node, history, and node-specific state.
 *
 * Workflow execution follows this model:
 * 1. Workflow starts in `idle` status
 * 2. After `start()` is called, status becomes `waiting`
 * 3. When an event arrives via `acceptEvent()`:
 *    - If current node accepts the event, status becomes `processing`
 *    - After determining next node, status becomes `transforming`
 *    - Once moved to next node, status returns to `waiting`
 *    - Process repeats recursively until node doesn't accept the event
 * 4. When workflow reaches an exit node, status becomes `completed`
 *
 * @example
 * ```typescript
 * const workflow = new WorkflowModel(workflowDef, nodeModels);
 * workflow.start();
 * await workflow.acceptEvent({ type: 'trigger', time: Date.now(), data: {} });
 * const context = workflow.getContext(); // Save for later resumption
 * ```
 */
class WorkflowModel {
  /** The workflow definition containing metadata, flow (nodes/edges), and options */
  workflow: Workflow;

  /** Array of instantiated node models for this workflow */
  nodes: NodeModel[] = [];

  /** Array of edge models connecting the nodes */
  edges: EdgeModel[] = [];

  /** The node currently waiting for events (null before start or after completion) */
  currentNode: NodeModel | null = null;

  /** Execution history recording workflow transitions */
  history: WorkflowHistoryItem[] = [];

  /** Current execution status of the workflow */
  status: WorkflowStatus = WorkflowStatus.Idle;

  /** Unique identifier for this workflow instance */
  instanceId: string = "";

  /** Unix timestamp (ms) when this workflow instance was started */
  startedAt: number = 0;

  /**
   * Creates a new WorkflowModel instance from a workflow definition.
   * @param workflow - The workflow definition to execute
   * @param nodeModels - Map of node type names to their NodeModel classes
   * @throws Error if workflow is invalid or missing required nodes
   */
  constructor(
    workflow: Workflow,
    nodeModels: Record<string, typeof NodeModel>
  ) {
    const ajv = new Ajv();
    const validate = ajv.compile(WorkflowSchema);

    if (!validate(workflow)) {
      throw new Error(
        "Invalid workflow data: " + ajv.errorsText(validate.errors)
      );
    }

    this.workflow = workflow;

    // TODO: import this function from @omega-flow/types
    function nodeHasType(node: Node): node is Node & { type: string } {
      return node.type !== undefined;
    }

    // Map nodes to their classes
    this.nodes = this.workflow.flow.nodes.filter(nodeHasType).map((node) => {
      const model = nodeModels[node.type];
      if (!model) {
        throw new Error(`Node type ${node.type} not found`);
      }
      return model.create(node);
    });

    // Map edges to their classes
    this.edges = this.workflow.flow.edges.map((e) => {
      const edge = new EdgeModel(e);

      const sourceNode = this.getNode(edge.getSourceNodeId());
      if (!sourceNode) {
        throw new Error(`Source node ${edge.getSourceNodeId()} not found`);
      }

      const targetNode = this.getNode(edge.getTargetNodeId());
      if (!targetNode) {
        throw new Error(`Target node ${edge.getTargetNodeId()} not found`);
      }

      sourceNode.connect(targetNode, edge);
      return edge;
    });

    if (!this.getStartNode()) {
      throw new Error("Workflow does not have a start node");
    }
  }

  // PUBLIC METHODS

  /**
   * Restores workflow state from a previously saved context.
   * Use this to resume a workflow that was interrupted or to restore from persistence.
   * After calling setContext, you must call start() to begin processing events.
   * @param context - The context to restore from
   * @throws Error if workflow is already running
   * @throws Error if context is invalid or doesn't match this workflow
   * @throws Error if the current node in context doesn't exist in the workflow
   */
  setContext(context: Context) {
    // Prevent setting context if workflow is already running
    if (this.status !== WorkflowStatus.Idle) {
      throw new Error("Workflow is already running");
    }

    // Ajv validation for context
    const ajv = new Ajv();
    const validate = ajv.compile(ContextSchema);

    if (!validate(context)) {
      throw new Error(
        "Invalid context data: " + ajv.errorsText(validate.errors)
      );
    }

    // Check if context id match flow id
    if (this.workflow.id !== context.workflowId) {
      throw new Error("Workflow id does not match");
    }

    // Find current node
    this.currentNode = this.getNode(context.currentNodeId);

    // Check if currentNode exist in flow (was not deleted)
    if (!this.currentNode) {
      throw new Error("Current node does not exist in workflow");
    }

    // Set states to nodes
    this.nodes.forEach((node) => {
      node.setState(context.nodeState[node.getId()] || {});
    });

    // Setting current history
    this.history = context.history || [];

    // Restore instanceId and startedAt from context
    this.instanceId = context.instanceId;
    this.startedAt = context.startedAt;

    if (context.isCompleted) {
      this.status = WorkflowStatus.Completed;
    }

    // After setting context, you need to run start()
  }

  /**
   * Exports the current workflow state as a Context object.
   * The context contains all information needed to restore the workflow later.
   * @returns A Context object containing workflow state
   */
  getContext(): Context {
    return {
      workflowId: this.workflow.id,
      instanceId: this.instanceId,
      currentNodeId: this.currentNode && this.currentNode.getId(),
      nodeState: this.nodes.reduce((acc, node) => {
        acc[node.getId()] = node.getState();
        return acc;
      }, {} as NodeState),
      history: this.history,
      isCompleted: this.status === WorkflowStatus.Completed,
      startedAt: this.startedAt,
    };
  }

  /**
   * Gets the current execution status of the workflow.
   * @returns The current WorkflowStatus
   */
  getStatus(): WorkflowStatus {
    return this.status;
  }

  /**
   * Starts or resumes the workflow execution.
   * If no context was set, starts from the beginning at the start node.
   * If a context was set via setContext(), resumes from the saved position.
   * @throws Error if workflow is already running or completed
   * @throws Error if workflow has no start node
   */
  start() {
    if (this.status === WorkflowStatus.Completed) {
      throw new Error("Workflow is already completed");
    }
    if (this.status !== WorkflowStatus.Idle) {
      throw new Error("Workflow is already running");
    }
    // If we starts new workflow, there is no current node, set it to start node
    if (!this.currentNode) {
      this.currentNode = this.getStartNode();
      // Set instanceId and startedAt only when starting a new workflow instance
      if (this.instanceId === "") {
        this.instanceId = `${Date.now()}-${Math.random()
          .toString(36)
          .substring(2, 11)}`;
      }
      if (this.startedAt === 0) {
        this.startedAt = Date.now();
      }
    }
    if (!this.currentNode) {
      throw new Error("Workflow does not have a start node");
    }
    this.status = WorkflowStatus.Waiting;
  }

  /**
   * Processes an incoming event through the workflow.
   *
   * This is the main event processing method. It passes the event to the current node
   * and handles workflow transitions. The method recursively processes the event through
   * subsequent nodes until a node doesn't accept the event or the workflow completes.
   *
   * @param event - The event to process
   * @throws Error if workflow is not in waiting status
   * @throws Error if event is invalid
   * @throws Error if current node is not set
   */
  async acceptEvent(event: Event): Promise<void> {
    if (this.status != WorkflowStatus.Waiting) {
      throw new Error(
        `Workflow cannot accept events in current status: ${this.status}`
      );
    }

    // Ajv validation for event
    const ajv = new Ajv();
    const validate = ajv.compile(EventSchema);

    if (!validate(event)) {
      throw new Error("Invalid event data: " + ajv.errorsText(validate.errors));
    }

    const currentNode = this.getCurrentNode();

    if (!currentNode) {
      throw new Error("Current node not set");
    }

    // Accept and process the event
    const processed = await currentNode.acceptEvent(event);

    // If node doesn't accept or isn't finished, set status to waiting and return
    if (!processed) {
      this.status = WorkflowStatus.Waiting;
      return;
    }
    // Change status to processing
    this.status = WorkflowStatus.Processing;

    // Determine next node
    const nextNode = await currentNode.nextNode(event);

    // If the next node is the same as the current node, we're done with this event
    // TODO: Should this works? If node is not accepting event it returns early, but when it accept it should move to next node
    if (currentNode.equals(nextNode)) {
      this.status = WorkflowStatus.Waiting;
      return;
    }

    // Workflow just started (start node returned different node)
    if (currentNode.equals(this.getStartNode())) {
      this.#startWorkflow(event);
    }

    // Workflow completed (returned node is null/undefined)
    if (!nextNode) {
      this.#completeWorkflow(event);
      return;
    }

    // Change status to transforming before moving to next node
    this.status = WorkflowStatus.Transforming;

    // Next node
    this.#moveToNode(nextNode, event);

    // Set status back to waiting
    this.status = WorkflowStatus.Waiting;

    // Continue processing with the next node
    return await this.acceptEvent(event);
  }

  // HELPER METHODS

  /**
   * Gets the current node that is waiting for events.
   * @returns The current NodeModel
   * @throws Error if workflow is not running (still idle)
   */
  getCurrentNode() {
    if (this.status === WorkflowStatus.Idle) {
      throw new Error("Workflow is not running");
    }
    return this.currentNode;
  }

  /**
   * Finds the start node of the workflow.
   * The start node is the node with no incoming edges.
   * @returns The start NodeModel, or null if not found
   */
  getStartNode() {
    // Find node which has no incoming edges
    const startNode = this.nodes.find((node) => {
      return !this.edges.some(
        (edge) => String(edge.getTargetNodeId()) === String(node.getId())
      );
    });
    return startNode || null;
  }

  /**
   * Finds a node by its ID.
   * @param nodeId - The ID of the node to find (can be null)
   * @returns The NodeModel if found, or null if not found or nodeId is null
   */
  getNode(nodeId: string | null): NodeModel | null {
    if (!nodeId) {
      return null;
    }
    const findNode = this.nodes.find(
      (node) => String(node.getId()) === String(nodeId)
    );
    return findNode || null;
  }

  // PRIVATE METHODS

  /**
   * Records workflow start in history.
   * Called when the workflow transitions from the start node.
   * @param _event - The triggering event (unused, kept for consistency)
   */
  #startWorkflow(_event: Event) {
    // History
    this.history.push({
      time: Date.now(),
      type: "started",
      fromNodeId: null,
      toNodeId: this.currentNode && this.currentNode.getId(),
    });
    this.#log();
  }

  /**
   * Moves the workflow to a new node and records the transition.
   * @param nextNode - The node to move to
   * @param _event - The triggering event (unused, kept for consistency)
   */
  #moveToNode(nextNode: NodeModel, _event: Event) {
    // History
    this.history.push({
      time: Date.now(),
      type: "step",
      fromNodeId: this.currentNode && this.currentNode.getId(),
      toNodeId: nextNode.getId(),
    });
    this.currentNode = nextNode;
    this.#log();
  }

  /**
   * Marks the workflow as completed and records the completion.
   * @param _event - The triggering event (unused, kept for consistency)
   */
  #completeWorkflow(_event: Event) {
    // History
    this.history.push({
      time: Date.now(),
      type: "completed",
      fromNodeId: this.currentNode && this.currentNode.getId(),
      toNodeId: null,
    });
    this.status = WorkflowStatus.Completed;
    this.#log();
  }

  /**
   * Internal logging helper for debugging workflow transitions.
   */
  #log() {
    // console.log(this.history[this.history.length - 1]);
  }
}

export default WorkflowModel;
