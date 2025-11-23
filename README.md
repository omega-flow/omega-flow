# Workflow

This is monorepo for omega-flow, it includes:

- `@omega-flow/types` - TypeScript types & JSON Schema (Ajv) for workflow, events, context, etc.
- `@omega-flow/engine` - Workflow engine & manager that can execute workflows, manage their state, and handle events.
- `@omega-flow/editor` - React-based workflow editor components for creating and managing workflows.

## Definitions

- Flow - A sequence of steps (nodes) that define a process or task. Flow is based on ReactFlow JSON structure.
  - Node - A step in the flow that can perform actions, wait for events, or make decisions.
  - Edge - A connection between nodes that defines the flow of execution.
- Workflow - Flow with additional metadata (name, description, tags, etc.) and options (retry, timeout, etc.).
  - WorkflowModel - A class that represents a Workflow, with methods to access its properties and manage its state.
  - NodeModel - A class that represents a Node in the workflow, with methods to access its properties and connections. Each node implements three key methods:
    - `acceptEvent`: Determines whether a node accepts an event (returns true/false)
    - `processEvent`: Processes the accepted event
    - `nextNode`: Determines which node should be processed next
    - you can pass data between those methods using setState/getState methods
  - EdgeModel - A class that represents an Edge in the workflow, with methods to access its properties.
  - Connection - A type that represents a connection between current node and its target node via an edge.
  - Event - A type that represents an Event that can trigger a workflow or move it to the next step.
    - from Event there should be easy way to identify Subject of the event ex. event.user_id
  - Context - A type that represents workflow saved stated (nodes state, current node, history of execution etc.) for each individual Subject.
  - Subject - An entity (user, order, device, etc.) that the workflow is executed for.
    - for each Subject there is separate Workflow started with its own Context.
- Workflow Engine - A system that executes workflows, manages their state, and handles events.
- Workflow Manager - A component that manages multiple workflows, their states, and interactions.
  - Workflow Store - a place where definitions of workflows are stored and retrieved.
  - Workflow Memory - a place where workflows context are stored and retrieved.
  - Workflow Scheduler - a component that we can use to schedule workflow events ex. Timeouts, Wait Nodes, Delays, etc.
- Workflow Editor - A user interface for creating and managing workflows.

## General Concepts

### Workflow Manager

- Workflow Manager can manage multiple Workflows
- when Event is received Workflow Manager is responsible for:
  - load Workflow definitions from Workflow Store
  - start new Workflows if is not started yet for the Subject of the Event
    - it can start multiple Workflows for the same Subject if multiple Workflows are triggered by the same Event
      - some workflows can be started only once per Subject, some can be started multiple times, this is defined in Workflow metadata
  - load Workflow Context from Workflow Memory if Workflow is already started for the Subject of the Event
    - can load multiple Contexts if multiple Workflows are started for the same Subject
  - pass Event to Workflow Engine to process it
  - save updated Workflow Context to Workflow Memory

### Workflow Metadata

TBD

### Workflow

- Workflow has one starting Node (called Start Node)
- Workflow can have multiple ending Nodes (called End Nodes)
- when Workflow starts, Start Node becomes Current Node
- Current Node waits for Events
- when Event is received via the `acceptEvent` method, Current Node checks if it can accept this Event
  - if Event is not accepted, Event is ignored, and Current Node continues to wait for other events
  - if Event is accepted, Current Node is processed with this Event, and Workflow moves to the next node
  - when next node is false|undefined, that means workflow finishes
  - IMPORTANT: if workflow is on some node, this not mean, this node was processed, it just means, this node is waiting for events, and when event is received, and is accepted, then node is processed, and after that workflow moves to the next node

### Workflow Statuses

Workflows have different statuses that represent their current state:

- `idle`: Initial status when a workflow is created but not yet started
- `waiting`: The workflow is running and waiting for events
- `processing`: The workflow is currently processing an accepted event
- `transforming`: The workflow is moving from one node to another
- `completed`: The workflow has finished execution

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
  workflowId: 1,
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

## Problems

1. How to handle long processing nodes, how notify Workflow that processing is done and workflow can continue?
2. How to handle Wait Node, when it can wait for days or weeks? Do we need some scheduler to wake up workflow after some time? How to notify Workflow (the same problem as above)?
3. What if there are some events in a queue to process, but first event cause a long process or its a wait node. We need to pause and wait for process to complete before processing next event. Context will be saved, but what happens to events in the queue? Do we keep them in memory? Or do we need some persistent queue? Or we just skip new events until workflow is ready to process them?
4. How to handle TriggerNode with timeouts. So we wait form some event, but if it does not come in X time, we move to timeout edge. Again we need some scheduler to wake up workflow after timeout.

ANSWER:

We are adding PENDING status to workflow. Pending means that current node waits for completion event - it can be either external event or internal event (timeout, long process completion, etc.). The logic to handle pending events should be implemented inside acceptEvent of that node.

For example: WaitNode first accepts the event, but when processing it returns special indicator that marks workflow as PENDING on that node. It alos schedule timeout event in the future. This can be saved in context. When timeout happens, scheduler triggers workflow with timeout event, and WaitNode acceptEvent functions checks using getState that it is pending, and now it can accept timeout event process it and move workflow to next node. In that case the processEvent is called two times - first time when wait starts, second time when timeout happens. So inside processEvent we need to check if we are starting wait or finishing it.

Other example: TriggerOrTimeoutNode first accepts the event, then in processEvent it check if Event match the trigger (normally this should be done in acceptEvent()). If it not match, it marks workflow as PENDING and schedule timeout event. Then following events are checked in acceptEvent, if they match trigger, workflow continues, if timeout event happens, workflow continues on timeout edge.
