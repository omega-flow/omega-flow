import type { Edge, Node } from "@xyflow/react";
import type { Workflow, WorkflowOptions } from "@omega-flow/types";

export interface EdgeOptions {
  sourceHandle?: string;
  targetHandle?: string;
}

export interface NodeData {
  label?: string;
  params?: Record<string, unknown>;
  conditions?: {
    all?: Array<{ fact: string; operator: string; value: unknown }>;
    any?: Array<{ fact: string; operator: string; value: unknown }>;
  };
  [key: string]: unknown;
}

export class WorkflowBuilder {
  private id: string;
  private name: string;
  private nodes: Node[] = [];
  private edges: Edge[] = [];
  private options: WorkflowOptions = {};
  private nodeYPosition = 0;
  private readonly Y_SPACING = 100;

  private constructor(id: string, name: string) {
    this.id = id;
    this.name = name;
  }

  static create(id: string, name: string): WorkflowBuilder {
    return new WorkflowBuilder(id, name);
  }

  addNode(id: string, type: string, data: NodeData = {}): this {
    const node: Node = {
      id,
      type,
      data,
      position: { x: 0, y: this.nodeYPosition },
    };

    this.nodes.push(node);
    this.nodeYPosition += this.Y_SPACING;

    return this;
  }

  addEdge(source: string, target: string, options: EdgeOptions = {}): this {
    const edgeId = options.sourceHandle
      ? `e${source}${options.sourceHandle[0]}-${target}`
      : `e${source}-${target}`;

    const edge: Edge = {
      id: edgeId,
      source,
      target,
      ...options,
    };

    this.edges.push(edge);

    return this;
  }

  withOptions(options: WorkflowOptions): this {
    this.options = { ...this.options, ...options };
    return this;
  }

  oneTime(): this {
    this.options.frequency = { type: "one_time" };
    return this;
  }

  everyRematch(interval?: number): this {
    this.options.frequency = { type: "every_rematch", interval };
    return this;
  }

  build(): Workflow {
    return {
      id: this.id,
      name: this.name,
      flow: {
        nodes: this.nodes,
        edges: this.edges,
      },
      options: this.options,
    };
  }
}
