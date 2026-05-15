# Core Concepts

This page explains the fundamental concepts of Omega Flow workflows.

## What is a Workflow?

A **workflow** is a directed graph that defines a sequence of steps executed in response to events. Each workflow consists of:

- **Nodes** - Individual steps (trigger, action, condition, etc.)
- **Edges** - Connections that define the flow between nodes
- **Options** - Configuration like execution frequency

```typescript
interface Workflow {
  id: string;
  name: string;
  flow: {
    nodes: Node[];
    edges: Edge[];
  };
  options: WorkflowOptions;
}
```

## Nodes

Nodes are the building blocks of workflows. A node in a saved workflow is just a small JSON object — an `id`, a `type` string, a `data` payload, and a `position` used by the visual editor to place the node on the canvas:

```typescript
{
  id: "trigger-1",
  type: "Trigger",
  data: { params: { event: "user.signup" } },
  position: { x: 250, y: 0 }
}
```

`position` is purely a visual concern — the engine ignores it. The editor reads and writes it as you drag nodes around.

The `type` string is what binds that object to runtime behaviour. Omega Flow looks up `type` in **two registries** — one in the engine, one in the editor — and a complete node implementation has an entry in both.

### NodeModel — execution side (engine)

A `NodeModel` is a class in `@omega-flow/engine` that implements how a node behaves when an event arrives. Every node type subclasses `NodeModel` and implements two methods:

- `acceptEvent(event)` — Returns `true` when the node accepts the event and processing is complete; the engine then calls `nextNode()` to move forward. Returns `false` when the node does not accept this event — the workflow stays on the current node and waits for another.
- `nextNode(event)` — called only after `acceptEvent` returned `true`. Returns the next `NodeModel`, or `null` to end the workflow.

The engine ships built-in models for `Trigger`, `Action`, `Condition`, `Wait`, `TriggerOrTimeout`, and `Exit`, exported as the `defaultNodeModels` map. You pass that map (optionally extended with your own) to `WorkflowManager`, which uses it to instantiate nodes when running a workflow:

```typescript
import { WorkflowManager, defaultNodeModels } from "@omega-flow/engine";
import HttpRequestNode from "./nodes/HttpRequestNode";

const manager = new WorkflowManager({
  // ...stores, memory, scheduler...
  nodeModels: { ...defaultNodeModels, HttpRequest: HttpRequestNode },
});
```

See [Custom Nodes (Engine)](/guide/engine-custom-nodes) for the full guide.

### NodeTypeDefinition — visual side (editor)

A `NodeTypeDefinition` is the editor-side counterpart. It declares how the node looks and how it is configured:

```typescript
interface NodeTypeDefinition {
  type: string;                                  // matches the engine NodeModel
  label: string;                                 // shown in the NodesPanel
  description?: string;
  Icon?: ComponentType<{ size?: number }>;
  defaultData: Record<string, unknown>;          // initial data on drop
  ViewComponent: ComponentType<NodeViewProps>;   // canvas rendering + handles
  DetailComponent: ComponentType<NodeDetailProps>; // properties panel form
}
```

`@omega-flow/editor` ships definitions for the same six built-in types as `defaultNodeTypes`. You pass them to `WorkflowEditor`, optionally combined with your own — `mergeNodeTypes` dedupes by `type`, which also lets you override a built-in:

```tsx
import {
  WorkflowEditor,
  defaultNodeTypes,
  mergeNodeTypes,
} from "@omega-flow/editor";

<WorkflowEditor nodeTypes={mergeNodeTypes(defaultNodeTypes, [sendEmailNodeType])}>
  {/* ... */}
</WorkflowEditor>
```

See [Custom Nodes (Editor)](/guide/custom-nodes) for the full guide.

### useNodeRegistry — bridging to ReactFlow

The `useNodeRegistry()` hook exposes the registered `NodeTypeDefinition`s and returns `reactFlowNodeTypes` — the `{ [type]: ViewComponent }` map [ReactFlow](https://reactflow.dev/) expects:

```tsx
const { reactFlowNodeTypes } = useNodeRegistry();
return <ReactFlow nodeTypes={reactFlowNodeTypes} /* ... */ />;
```

### Extending Omega Flow

Adding a new node type means creating both halves and giving them the same `type` string:

| Side | What you create | Where it goes |
|------|------------------|---------------|
| Engine | A `NodeModel` subclass | Pass via `nodeModels` to `WorkflowManager` |
| Editor | A `NodeTypeDefinition` (with View + Detail components) | Pass via `nodeTypes` to `WorkflowEditor` |

The engine half drives execution; the editor half drives the visual representation. Either can be used independently — a server-only setup needs no `NodeTypeDefinition`, and a read-only viewer can render workflows without ever instantiating a `NodeModel` — but a fully editable, runnable node needs both.

### Built-in node types

The engine and editor both ship the following types out of the box:

| Type | Purpose |
|------|---------|
| `Trigger` | Entry point — accepts events of a specific `event` type. |
| `Action` | Pass-through step — record an action and continue. |
| `Condition` | Branches on rules in the shared `Conditions` format (top-level OR between groups; each group is `all` or `any`). Has `true` / `false` outputs. |
| `Wait` | Pauses for a fixed duration (ms). |
| `TriggerOrTimeout` | Continues on a matching event or after a timeout, whichever comes first. |
| `Exit` | Terminates the workflow. |

Execution semantics are covered in [Custom Nodes (Engine)](/guide/engine-custom-nodes#built-in-node-types-reference). Handle layouts are covered in the next subsection.

### Handles

Handles are the connection points on a node where edges attach. Every node declares its own handles:

- **Target handles** — inputs, rendered on the top of the node
- **Source handles** — outputs, rendered on the bottom of the node

Each handle has an id. Edges reference these ids via `sourceHandle` and `targetHandle` — see [Edges](#edges) below.

#### Built-in node handles

| Node | Target handles (inputs) | Source handles (outputs) |
|------|-------------------------|--------------------------|
| `Trigger` | — (entry point) | `output` |
| `Action` | `input` | `output` |
| `Condition` | `input` | `true`, `false` |
| `Wait` | `input` | `output` |
| `TriggerOrTimeout` | `input` | `trigger`, `timeout` |
| `Exit` | `input` | — (terminates) |

A few notes on the built-ins:

- **`Trigger`** has no target handle — it is always the starting point of a branch.
- **`Exit`** has no source handle — it terminates the workflow.
- **`Condition`** has two source handles. Edges leaving it **must** specify `sourceHandle: "true"` or `sourceHandle: "false"`.
- **`TriggerOrTimeout`** has two source handles. Edges leaving it **must** specify `sourceHandle: "trigger"` (taken when the matching event arrives) or `sourceHandle: "timeout"` (taken when the duration elapses first).

#### Defining handles on a custom node

Handles are declared in the editor's `ViewComponent`, not on the `NodeModel` or the `NodeTypeDefinition` itself. Pass `sourceHandles` and `targetHandles` to `BaseNodeView`:

```tsx
<BaseNodeView
  // ...other props
  sourceHandles={[{ id: "yes", label: "Yes" }, { id: "no", label: "No" }]}
  targetHandles={[{ id: "input", label: "In" }]}
/>
```

The engine then routes execution to those handles from `nextNode()` — e.g. `this.getTargetNodeFromSourceHandle("yes")`. See [Custom Nodes (Editor) → Step 3](/guide/custom-nodes#step-3-create-the-view-component) for the full pattern.

## Edges

Edges connect nodes and define the flow of execution.

```typescript
{
  id: "edge-1",
  source: "trigger-1",      // Source node ID
  target: "action-1",       // Target node ID
  sourceHandle: "output",   // Optional: source handle id on the source node
  targetHandle: "input"     // Optional: target handle id on the target node
}
```

When an edge leaves a specific output (e.g. the `true` branch of a Condition), set `sourceHandle` on the edge. Likewise, set `targetHandle` when the destination node has more than one input. For nodes with a single input/output, the handle id can be omitted on the edge.

Handles themselves — and the layouts of the built-in nodes — are documented in [Nodes → Handles](#handles) above.

## Events

Events drive workflow execution. An event is a discrete occurrence in the system.

```typescript
interface Event {
  id: string;       // Unique identifier
  time: number;     // Unix timestamp (ms)
  type: string;     // Event type (e.g., "user.signup")
  data?: any;       // Optional payload
}
```

### Event Flow

1. Event arrives at Workflow Manager
2. Manager runs the **`eventExtractor`** to derive `[domain, subjectId]` from the event
3. Manager loads workflows for that domain and active contexts for that Subject
4. For each active instance, the event is passed to the current node's `acceptEvent` method
5. If a workflow has no active instance for the Subject, the Manager checks `WorkflowOptions.frequency` to decide whether to start a new one
6. If accepted, the workflow processes and moves to the next node
7. Process repeats until each workflow reaches a waiting state or completes

### Tenants and Subjects

Routing is entirely driven by the **`eventExtractor`** function you pass to `WorkflowManager`. It maps every incoming event to a `[domain, subjectId]` tuple — there is no implicit notion of "current user" inside the engine.

```typescript
// Single-tenant: domain is constant, subject is the user
eventExtractor: (event) => ["default", event.data.userId];

// Multi-tenant: tenant lives on the event payload
eventExtractor: (event) => [event.data.tenantId, event.data.userId];

// Different subject types per event
eventExtractor: (event) => event.type.startsWith("order.")
  ? ["orders", event.data.orderId]
  : ["users", event.data.userId];
```

- **Domain** scopes which workflow definitions are loaded (the `WorkflowStore` is queried per domain). Use it for tenant isolation.
- **Subject** is the entity the workflow runs *for* — a user, an order, a device. Each Subject has its own independent workflow Context, so two users running the same workflow never share state.

See [Workflow Execution → Event Extraction](/guide/engine-execution#event-extraction) for more patterns.

### Starting a new instance vs. resuming

Whether an event resumes an existing instance or starts a fresh one is governed by `WorkflowOptions.frequency`:

| `frequency.type` | New instance is started when… |
|------------------|------------------------------|
| `one_time` (default) | The Subject has **never** matched the trigger before — neither active nor completed instances exist. |
| `every_rematch` | No instance is currently active **and** at least `interval` seconds have passed since the most recent completed instance started. |

Two consequences worth calling out:

- **An active instance always blocks a new one.** Even with `every_rematch`, the Manager will not run two instances of the same workflow for the same Subject in parallel — the in-flight one must complete first.
- **`one_time` is permanent.** Once a Subject has completed (or even started) the workflow, that workflow is closed for them forever. Use `every_rematch` if you need re-entry.

See [Workflow Options → Frequency](#frequency) below for the full configuration.

## Context

Context stores the execution state for a workflow instance.

```typescript
interface Context {
  workflowId: string;           // Which workflow
  instanceId: string;           // Unique instance ID
  currentNodeId: string | null; // Current position
  nodeState: NodeState;         // Node-specific data
  history: WorkflowHistoryItem[]; // Execution log
  isCompleted?: boolean;        // Completion flag
  startedAt: number;            // Start timestamp
}
```

### Multiple Instances

Each **Subject** (user, order, device, etc.) can have its own workflow instance with separate context. This allows:

- Multiple subjects running the same workflow independently
- Multiple workflow instances per subject (with `every_rematch`)
- Isolated state for each execution

## Workflow Options

### Frequency

Controls how often a subject can enter/re-enter a workflow:

```typescript
interface WorkflowFrequency {
  type: "one_time" | "every_rematch";
  interval?: number;  // seconds
}
```

#### One Time

```typescript
{
  frequency: {
    type: "one_time"
  }
}
```

Subject enters only the first time they match trigger conditions. Never enters again.

**Use case:** Welcome email workflow - send only once per user.

#### Every Rematch

```typescript
{
  frequency: {
    type: "every_rematch",
    interval: 86400  // 24 hours
  }
}
```

Subject can re-enter when they match trigger conditions again, but:
- Not more than once simultaneously
- Not more often than the specified interval

**Use case:** Re-engagement workflow - can restart every 7 days if user is inactive.

## Workflow Statuses

Workflows progress through these states:

| Status | Description |
|--------|-------------|
| `idle` | Created but not started |
| `waiting` | Running, waiting for events |
| `processing` | Currently handling an event |
| `transforming` | Moving between nodes |
| `completed` | Finished execution |

## Example Workflow

Here's a complete example - a user onboarding workflow:

```javascript
{
  id: "user-onboarding",
  name: "User Onboarding",
  flow: {
    nodes: [
      {
        id: "trigger-1",
        type: "Trigger",
        data: { params: { event: "user.signup" } },
        position: { x: 250, y: 0 }
      },
      {
        id: "action-1",
        type: "Action",
        data: { action: "send_welcome_email", params: {} },
        position: { x: 250, y: 100 }
      },
      {
        id: "wait-1",
        type: "Wait",
        data: { params: { duration: 86400000 } }, // 24h
        position: { x: 250, y: 200 }
      },
      {
        id: "condition-1",
        type: "Condition",
        data: {
          conditions: {
            all: [{
              fact: "user.completed_profile",
              operator: "equal",
              value: true
            }]
          }
        },
        position: { x: 250, y: 300 }
      },
      {
        id: "action-2",
        type: "Action",
        data: { action: "send_reminder_email", params: {} },
        position: { x: 100, y: 400 }
      },
      {
        id: "exit-1",
        type: "Exit",
        data: {},
        position: { x: 400, y: 400 }
      }
    ],
    edges: [
      { id: "e1", source: "trigger-1", target: "action-1" },
      { id: "e2", source: "action-1", target: "wait-1" },
      { id: "e3", source: "wait-1", target: "condition-1" },
      { id: "e4", source: "condition-1", sourceHandle: "false", target: "action-2" },
      { id: "e5", source: "condition-1", sourceHandle: "true", target: "exit-1" },
      { id: "e6", source: "action-2", target: "exit-1" }
    ]
  },
  options: {
    frequency: {
      type: "one_time"
    }
  }
}
```

This workflow:
1. Triggers on `user.signup` event
2. Sends a welcome email
3. Waits 24 hours
4. Checks if user completed their profile
5. If not, sends a reminder email
6. Exits

## Architecture Overview

### Workflow Manager

- Manages multiple workflows
- Loads workflow definitions from Store
- Loads/saves execution contexts from Memory
- Routes events to appropriate workflow instances
- Schedules future events via Scheduler

### Workflow Engine

- Executes individual workflow instances
- Processes events through nodes
- Manages workflow state transitions
- Validates data using schemas

## Next Steps

- Learn how to [execute workflows](/guide/engine-execution) with the engine
- Learn how to [set up the editor](/guide/editor-setup)
- Create custom nodes for the [engine](/guide/engine-custom-nodes) and [editor](/guide/custom-nodes)
- Explore the [API reference](/api/components)
