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

Nodes are the building blocks of workflows. Each node type serves a specific purpose:

### Trigger Node

The starting point of a workflow. Waits for a specific event type.

```typescript
{
  type: "Trigger",
  data: {
    params: {
      event: "user.signup"
    }
  }
}
```

### Action Node

Performs an action and continues to the next node.

```typescript
{
  type: "Action",
  data: {
    action: "send_welcome_email",
    params: {
      template: "welcome"
    }
  }
}
```

### Condition Node

Evaluates conditions and branches the flow. Uses [json-rules-engine](https://github.com/CacheControl/json-rules-engine) format.

```typescript
{
  type: "Condition",
  data: {
    conditions: {
      all: [
        {
          fact: "user.plan",
          operator: "equal",
          value: "premium"
        }
      ]
    }
  }
}
```

Has two outputs: `true` and `false`.

### Wait Node

Pauses the workflow for a specified duration.

```typescript
{
  type: "Wait",
  data: {
    params: {
      duration: 86400000  // 24 hours in ms
    }
  }
}
```

### TriggerOrTimeout Node

Waits for either an event or a timeout, whichever comes first.

```typescript
{
  type: "TriggerOrTimeout",
  data: {
    params: {
      event: "user.completed_profile",
      duration: 604800000  // 7 days in ms
    }
  }
}
```

### Exit Node

Terminates the workflow.

```typescript
{
  type: "Exit",
  data: {}
}
```

## Edges

Edges connect nodes and define the flow of execution.

```typescript
{
  id: "edge-1",
  source: "trigger-1",      // Source node ID
  target: "action-1",       // Target node ID
  sourceHandle: "output",   // Optional: specific output handle
  targetHandle: "input"     // Optional: specific input handle
}
```

### Handles

Nodes can have multiple **handles** (connection points):

- **Source handles** - Outputs (bottom of node)
- **Target handles** - Inputs (top of node)

For example, a Condition node has:
- 1 target handle: `input`
- 2 source handles: `true`, `false`

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
2. Manager finds workflows listening for this event type
3. Manager loads/creates Context for the Subject
4. Event is passed to current node's `acceptEvent` method
5. If accepted, workflow processes and moves to next node
6. Process repeats until workflow reaches waiting state or completes

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

```
┌─────────────────────────────────────────────────────────────────┐
│                      Workflow Manager                           │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐ │
│  │  Workflow   │  │  Workflow   │  │      Workflow           │ │
│  │   Store     │  │   Memory    │  │      Scheduler          │ │
│  │ (definitions)│  │ (contexts)  │  │  (future events)        │ │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Workflow Engine                            │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    WorkflowModel                         │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌─────────┐  │   │
│  │  │ NodeModel│→ │ NodeModel│→ │ NodeModel│→ │NodeModel│  │   │
│  │  │ (Trigger)│  │ (Action) │  │(Condition)│  │ (Exit)  │  │   │
│  │  └──────────┘  └──────────┘  └──────────┘  └─────────┘  │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

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

### Node Models

Each node type has a corresponding model class implementing:

- `acceptEvent(event)` - Check if event should be processed
- `nextNode(event)` - Determine the next node to execute

## Next Steps

- Learn how to [execute workflows](/guide/engine-execution) with the engine
- Learn how to [set up the editor](/guide/editor-setup)
- Create custom nodes for the [engine](/guide/engine-custom-nodes) and [editor](/guide/custom-nodes)
- Explore the [API reference](/api/components)
