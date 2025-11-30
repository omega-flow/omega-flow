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

class WorkflowModel {
  workflow: Workflow;
  nodes: NodeModel[] = [];
  edges: EdgeModel[] = [];
  currentNode: NodeModel | null = null;
  history: WorkflowHistoryItem[] = [];
  status: WorkflowStatus = WorkflowStatus.Idle;

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

    if (context.isCompleted) {
      this.status = WorkflowStatus.Completed;
    }

    // After setting context, you need to run start()
  }

  getContext(): Context {
    return {
      workflowId: this.workflow.id,
      currentNodeId: this.currentNode && this.currentNode.getId(),
      nodeState: this.nodes.reduce((acc, node) => {
        acc[node.getId()] = node.getState();
        return acc;
      }, {} as NodeState),
      history: this.history,
      isCompleted: this.status === WorkflowStatus.Completed,
    };
  }

  getStatus(): WorkflowStatus {
    return this.status;
  }

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
    }
    if (!this.currentNode) {
      throw new Error("Workflow does not have a start node");
    }
    this.status = WorkflowStatus.Waiting;
  }

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

  getCurrentNode() {
    if (this.status === WorkflowStatus.Idle) {
      throw new Error("Workflow is not running");
    }
    return this.currentNode;
  }

  getStartNode() {
    // Find node which has no incoming edges
    const startNode = this.nodes.find((node) => {
      return !this.edges.some(
        (edge) => String(edge.getTargetNodeId()) === String(node.getId())
      );
    });
    return startNode || null;
  }

  // TODO: Accept null? Return null?
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

  #startWorkflow(event: Event) {
    // History
    this.history.push({
      time: Date.now(),
      type: "started",
      fromNodeId: null,
      toNodeId: this.currentNode && this.currentNode.getId(),
    });
    this.#log();
  }

  #moveToNode(nextNode: NodeModel, event: Event) {
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

  #completeWorkflow(event: Event) {
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

  #log() {
    // console.log(this.history[this.history.length - 1]);
  }
}

export default WorkflowModel;
