# Executing Workflows

This guide explains how to execute workflows using the `@omega-flow/engine` package.

## Overview

The engine provides the runtime execution environment for workflows. It processes events, manages workflow state, and coordinates multiple workflow instances across subjects.

The engine has three main layers:

1. **WorkflowManager** - Orchestrates multiple workflows across domains and subjects
2. **WorkflowModel** - Executes individual workflow instances
3. **NodeModel** - Individual node implementations that process events

## Installation

```bash
pnpm add @omega-flow/engine @omega-flow/types
```

## Quick Start

Here's a minimal example to execute a workflow:

```typescript
import {
  WorkflowManager,
  WorkflowModel,
  InMemoryWorkflowStore,
  InMemoryWorkflowMemory,
  InMemoryWorkflowScheduler,
  nodeModels,
} from "@omega-flow/engine";
import type { Workflow, Event } from "@omega-flow/types";

// 1. Define a workflow
const myWorkflow: Workflow = {
  id: "welcome-flow",
  name: "Welcome Flow",
  flow: {
    nodes: [
      { id: "trigger", type: "Trigger", data: { params: { event: "user.signup" } }, position: { x: 0, y: 0 } },
      { id: "action", type: "Action", data: { action: "sendWelcomeEmail" }, position: { x: 0, y: 100 } },
      { id: "exit", type: "Exit", data: {}, position: { x: 0, y: 200 } },
    ],
    edges: [
      { id: "e1", source: "trigger", target: "action" },
      { id: "e2", source: "action", target: "exit" },
    ],
  },
  options: {
    frequency: { type: "one_time" }
  }
};

// 2. Create the manager
const manager = new WorkflowManager({
  workflowStore: new InMemoryWorkflowStore("default", [myWorkflow]),
  workflowMemory: new InMemoryWorkflowMemory(),
  workflowScheduler: new InMemoryWorkflowScheduler(),
  nodeModels,
  eventExtractor: (event) => ["default", event.data.userId],
});

// 3. Process events
const event: Event = {
  id: "evt-1",
  type: "user.signup",
  time: Date.now(),
  data: { userId: "user-123" }
};

await manager.processEvent(event);
```

## Using WorkflowManager

`WorkflowManager` is the top-level coordinator that handles:

- Routing events to appropriate workflow instances
- Starting new workflow instances based on trigger matching
- Resuming existing workflow instances with new events
- Enforcing frequency rules (one_time, every_rematch)
- Persisting workflow state via WorkflowMemory

### Configuration

```typescript
interface WorkflowManagerConfig {
  // Storage for workflow definitions
  workflowStore: WorkflowStore;

  // Storage for workflow execution state (contexts)
  workflowMemory: WorkflowMemory;

  // Scheduler for time-based events (Wait nodes)
  workflowScheduler: WorkflowScheduler;

  // Map of node type names to their NodeModel classes
  nodeModels: Record<string, typeof NodeModel>;

  // Function to extract domain and subject ID from events
  eventExtractor: (event: Event) => [domain: string, subjectId: string];
}
```

### Event Extraction

The `eventExtractor` function determines how events are routed:

```typescript
// Simple: all events go to same domain, subject from event data
eventExtractor: (event) => ["default", event.data.userId]

// Multi-tenant: domain and subject from event
eventExtractor: (event) => [event.data.tenantId, event.data.userId]

// Different subject types
eventExtractor: (event) => {
  if (event.type.startsWith("order.")) {
    return ["orders", event.data.orderId];
  }
  return ["users", event.data.userId];
}
```

### Processing Events

```typescript
const event: Event = {
  id: "unique-event-id",
  type: "user.signup",    // Event type - matched by Trigger nodes
  time: Date.now(),       // Unix timestamp in milliseconds
  data: {                 // Event payload
    userId: "user-123",
    email: "user@example.com"
  }
};

await manager.processEvent(event);
```

When `processEvent` is called:

1. Extract domain and subject ID from event
2. Load all workflows for the domain
3. For each workflow:
   - Resume all active instances with the event
   - Check if a new instance should start
   - Start new instance if trigger accepts the event

## Using WorkflowModel Directly

For simpler use cases or testing, you can use `WorkflowModel` directly:

```typescript
import { WorkflowModel, nodeModels } from "@omega-flow/engine";

// Create and start a workflow
const workflow = new WorkflowModel(myWorkflow, nodeModels);
workflow.start();

// Process an event
await workflow.acceptEvent(event);

// Check status
console.log(workflow.getStatus());        // "waiting", "completed", etc.
console.log(workflow.getCurrentNode());   // Current node position
console.log(workflow.getContext());       // Full execution state
```

### Workflow Status

Workflows progress through these states:

| Status | Description |
|--------|-------------|
| `idle` | Created but not started |
| `waiting` | Running, waiting for events on current node |
| `processing` | Currently handling an event in a node |
| `transforming` | Moving from one node to another |
| `completed` | Workflow finished (reached Exit or null node) |

### Saving and Restoring State

To persist workflow state between events:

```typescript
// After processing, get the context
const context = workflow.getContext();
// Save context to your database...

// Later, restore and continue
const workflow = new WorkflowModel(myWorkflow, nodeModels);
workflow.setContext(savedContext);
workflow.start();

// Process the next event
await workflow.acceptEvent(nextEvent);
```

## Storage Interfaces

The engine uses three interfaces for pluggable storage:

### WorkflowStore

Provides workflow definitions:

```typescript
interface WorkflowStore {
  getWorkflow(domain: string, workflowId: string): Promise<Workflow | null>;
  getAllWorkflows(domain: string): Promise<Workflow[]>;
}
```

### WorkflowMemory

Persists execution state:

```typescript
interface WorkflowMemory {
  getContexts(domain: string, workflowId: string, subjectId: string): Promise<Context[]>;
  saveContext(domain: string, workflowId: string, subjectId: string, context: Context): Promise<void>;
  deleteContext(domain: string, workflowId: string, subjectId: string, instanceId: string): Promise<void>;
}
```

### WorkflowScheduler

Schedules future events:

```typescript
interface WorkflowScheduler {
  // Implementation varies based on your scheduling needs
}
```

### Built-in Implementations

The engine includes in-memory implementations for development and testing:

- `InMemoryWorkflowStore` - Stores workflows in memory
- `InMemoryWorkflowMemory` - Stores contexts in memory
- `InMemoryWorkflowScheduler` - Basic scheduler implementation

For production, implement these interfaces with your preferred storage (database, Redis, etc.).

## Event Processing Flow

Understanding how events flow through the system:

```
Event arrives
    │
    ▼
WorkflowManager.processEvent(event)
    │
    ├── Extract domain & subjectId via eventExtractor
    │
    ├── For each workflow in domain:
    │   │
    │   ├── Resume active instances with event
    │   │   └── WorkflowModel.acceptEvent(event)
    │   │
    │   └── Try to start new instance
    │       └── WorkflowModel.acceptEvent(event)
    │
    └── Save updated contexts to WorkflowMemory
```

### Inside WorkflowModel.acceptEvent

```
acceptEvent(event)
    │
    ├── Current node's acceptEvent(event) called
    │   │
    │   ├── Returns false → Stay on node, workflow remains "waiting"
    │   │
    │   └── Returns true → Event accepted
    │       │
    │       ├── Call node's nextNode(event)
    │       │
    │       ├── Move to next node (or complete if null)
    │       │
    │       └── Recursively call acceptEvent on new node
    │           (continues until false or completed)
```

## Workflow Frequency

Control how often subjects can enter workflows:

### One Time

```typescript
options: {
  frequency: { type: "one_time" }
}
```

Subject enters only once, ever. Ideal for:
- Welcome emails
- Account activation flows
- One-time onboarding

### Every Rematch

```typescript
options: {
  frequency: {
    type: "every_rematch",
    interval: 86400  // Seconds (24 hours)
  }
}
```

Subject can re-enter when:
- No active instance exists
- Interval has passed since last instance started

Ideal for:
- Re-engagement campaigns
- Periodic notifications
- Recurring workflows

## Context Structure

The `Context` object contains all execution state:

```typescript
interface Context {
  workflowId: string;           // ID of the workflow
  instanceId: string;           // Unique instance identifier
  currentNodeId: string | null; // Current node position
  nodeState: NodeState;         // State data for each node
  history: WorkflowHistoryItem[]; // Execution log
  isCompleted?: boolean;        // Completion flag
  startedAt: number;            // Start timestamp (ms)
}
```

### Execution History

The `history` array tracks all state transitions:

```typescript
interface WorkflowHistoryItem {
  nodeId: string;
  status: string;
  timestamp: number;
  eventId?: string;
}
```

## Error Handling

The engine handles errors gracefully:

```typescript
// Individual workflow errors don't stop other workflows
await manager.processEvent(event);
// Errors are logged, processing continues for other workflows

// For direct WorkflowModel use, wrap in try-catch
try {
  await workflow.acceptEvent(event);
} catch (error) {
  console.error("Workflow error:", error);
  // Handle error (retry, alert, etc.)
}
```

## Testing Workflows

Use the built-in in-memory implementations for testing:

```typescript
import { describe, it, expect, beforeEach } from "vitest";
import { WorkflowModel, nodeModels } from "@omega-flow/engine";

describe("My Workflow", () => {
  let workflow: WorkflowModel;

  beforeEach(() => {
    workflow = new WorkflowModel(myWorkflow, nodeModels);
    workflow.start();
  });

  it("should trigger on user.signup event", async () => {
    const event = {
      id: "1",
      type: "user.signup",
      time: Date.now(),
      data: { userId: "user-1" }
    };

    await workflow.acceptEvent(event);

    expect(workflow.getStatus()).toBe("completed");
    expect(workflow.getContext().history).toHaveLength(4);
  });

  it("should not trigger on wrong event type", async () => {
    const event = {
      id: "1",
      type: "wrong.event",
      time: Date.now(),
      data: {}
    };

    await workflow.acceptEvent(event);

    expect(workflow.getStatus()).toBe("waiting");
    expect(workflow.getCurrentNode()?.getId()).toBe("trigger");
  });
});
```

## Next Steps

- Learn to [create custom nodes for the engine](/guide/engine-custom-nodes)
- Understand [core concepts](/guide/core-concepts) in depth
- Set up the [visual workflow editor](/guide/editor-setup)
