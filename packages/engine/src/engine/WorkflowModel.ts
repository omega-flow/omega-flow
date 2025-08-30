import Ajv from "ajv";

import {
  type Workflow,
  type Context,
  type NodeState,
  type Event,
  type Node,
  WorkflowSchema,
  WorkflowHistoryItem,
} from "@omega-flow/types";

import NodeModel from "./NodeModel";
import EdgeModel from "./EdgeModel";

class WorkflowModel {
  workflow: Workflow;
  nodes: NodeModel[] = [];
  edges: EdgeModel[] = [];
  currentNode: NodeModel | null = null;
  history: WorkflowHistoryItem[] = [];
  // TODO: change to status
  isRunning: boolean = false;

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

    function nodeHasType(node: Node): node is Node & { type: string } {
      return node.type !== undefined;
    }

    // Map nodes to their classes
    this.nodes = this.workflow.flow.nodes.filter(nodeHasType).map((node) => {
      const model = nodeModels[node.type];
      if (!model) {
        throw new Error(`Node type ${node.type} not found`);
      }
      return new model(node);
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
    if (this.isRunning) {
      throw new Error("Workflow is already running");
    }

    // TODO: Add Ajv validation for context
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
    };
  }

  start() {
    if (this.isRunning) {
      throw new Error("Workflow is already running");
    }
    // If we starts new workflow, there is no current node, set it to start node
    if (!this.currentNode) {
      this.currentNode = this.getStartNode();
    }
    if (!this.currentNode) {
      throw new Error("Workflow does not have a start node");
    }
    this.isRunning = true;
  }

  async sendEvent(event: Event): Promise<void> {
    if (!this.isRunning) {
      throw new Error("Workflow is not running");
    }

    const currentNode = this.getCurrentNode();

    if (!currentNode) {
      throw new Error("Current node not set");
    }

    const nextNode = await currentNode.acceptEvent(event);

    // The same node, nothing changed, exit
    if (currentNode.equals(nextNode)) {
      return;
    }

    // Workflow just started (start node returned different node),
    if (currentNode.equals(this.getStartNode())) {
      this.#startWorkflow(event);
    }

    // Workflow completed (returned node is null/undefined)
    if (!nextNode) {
      this.#completeWorkflow(event);
      return;
    }

    // Next node
    this.#moveToNode(nextNode, event);

    return await this.sendEvent(event);
  }

  getCurrentNode() {
    if (!this.isRunning) {
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
    // this.status = "completed";
    this.#log();
  }

  #log() {
    // console.log(this.history[this.history.length - 1]);
  }
}

export default WorkflowModel;
