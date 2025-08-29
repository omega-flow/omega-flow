# Workflow

This is monorepo for omega-flow, it includes:

- `@omega-flow/types` - TypeScript types for workflow, nodes, edges, events, context, etc.
- `@omega-flow/engine` - Workflow engine that can execute workflows, manage their state, and handle events.
- `@omega-flow/editor` - React-based workflow editor for creating and managing workflows.

## Definitions

- Flow - A sequence of steps (nodes) that define a process or task. Flow is based on ReactFlow JSON structure.
  - Node - A step in the flow that can perform actions, wait for events, or make decisions.
  - Edge - A connection between nodes that defines the flow of execution.
- Workflow - Flow with additional metadata (name, description, tags, etc.) and options (retry, timeout, etc.).
  - WorkflowModel - A class that represents a Workflow, with methods to access its properties and manage its state.
  - NodeModel - A class that represents a Node in the workflow, with methods to access its properties and connections.
  - EdgeModel - A class that represents an Edge in the workflow, with methods to access its properties.
  - Connection - A type that represents a connection between current node and its target node via an edge.
  - EventModel - A class that represents an Event that can trigger a workflow or move it to the next step.
- Workflow Engine - A system that executes workflows, manages their state, and handles events.
  - Context - Workflow saved stated (nodes state, current node, history of execution etc.).
  - Event - An event that can trigger a workflow, or move it to the next step.
- Workflow Editor - A user interface for creating and managing workflows.

## General Concepts

- Workflow has one starting Node (called Start Node)
- Workflow can have multiple ending Nodes (called End Nodes)
- when Workflow starts, Start Node becomes Current Node
- Current Node waits for Events
- when Event is received, Current Node check if it can accept this Event
  - if Event is not accepted, Event is ignored, and Current Node continues to wait for other events
  - if Event is accepted, Current Node is processed with this Event, and Workflow moves to the next node
  - IMPORTANT: if workflow is on some node, this not mean, this node was processed, it just means, this node is waiting for events, and when event is received, and is accepted, then node is processed, and workflow moves to the next node

## Sample

### Flow

```js
{
  nodes: [
    {
      id: "1",
      type: "SegmentChange",
      data: {
        label: "Trigger",
        segment: {
          id: 1,
        },
        change: "new",
      },
      position: { x: 0, y: -50 },
      measured: { width: 0, height: 36 },
    },
    {
      id: "2",
      type: "Condition",
      data: {
        label: "if user is men",
        conditions: {
          // json-rules-engine conditions
          all: [
            {
              fact: "user_id",
              operator: "equal",
              value: 1,
            },
          ],
        },
      },
      position: { x: 0, y: 50 },
      measured: { width: 150, height: 36 },
    },
    {
      id: "3",
      type: "Action",
      data: { label: "Node 3" },
      position: { x: 0, y: 100 },
      measured: { width: 150, height: 36 },
    },
    {
      id: "4",
      type: "Exit",
      data: { label: "Node 2" },
      position: { x: 0, y: 150 },
      measured: { width: 150, height: 36 },
    },
  ],
  edges: [
    { id: "e1d-2", source: "1", target: "2" },
    { id: "e2t-4", source: "2", sourceHandle: "true", target: "4" },
    { id: "e2f-3", source: "2", sourceHandle: "false", target: "3" },
    { id: "e3d-4", source: "3", target: "4" },
  ],
  viewport: {
    x: 484.74631195103916,
    y: 189.61067224968303,
    zoom: 0.5486659687896216,
  },
}
```

### Workflow

```js
{
  id: 1,
  name: "My Workflow",
  flow: { ...flow },
  options: {
    // to be defined
  },
}
```

### Context

```js
{
  workflow_id: 1,
  currentNodeId: "2",
  nodeState: {
    1: { data: {} },
    2: { data: {} },
  },
  history: [
    {
      time: 123456789,
      type: "event",
      event: {},
    },
    {
      time: 123456789,
      type: "step",
      nodeId: 1,
      data: {},
    }
  ]
}
```
