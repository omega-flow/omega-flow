# Custom Nodes for Engine

This guide explains how to create custom node types for workflow execution in the `@omega-flow/engine`.

::: tip Complete Custom Node Implementation
A complete custom node implementation requires both:
1. **Engine-side**: NodeModel class (this guide) - handles execution logic
2. **Editor-side**: NodeTypeDefinition (see [Custom Nodes for Editor](/guide/custom-nodes)) - handles visual representation

Both parts use the same `type` identifier to connect them.
:::

## Overview

Each node type in the engine is a class that extends `NodeModel` and implements two key methods:

- **`acceptEvent(event)`** - Determines if the node accepts an event and processes it
- **`nextNode(event)`** - Determines which node to execute next

## NodeModel Base Class

The `NodeModel` class provides the foundation for all node types:

```typescript
import NodeModel from "@omega-flow/engine/engine/NodeModel";
import type { Node, Event } from "@omega-flow/types";

class MyCustomNode extends NodeModel {
  constructor(node: Node) {
    super(node);
  }

  async acceptEvent(event: Event): Promise<boolean> {
    // Return true if event is accepted and processing complete
    // Return false if still waiting or event not accepted
  }

  async nextNode(event: Event): Promise<NodeModel | null> {
    // Return the next node to execute
    // Return null to end the workflow
  }
}
```

### Available Methods

| Method | Description |
|--------|-------------|
| `getId()` | Returns the node's unique identifier |
| `getData()` | Returns the node's data payload (params, config, etc.) |
| `getState()` | Gets the node's internal state |
| `setState(state)` | Replaces the node's state |
| `updateState(changes)` | Merges changes into existing state |
| `getConnections()` | Returns all outgoing connections |
| `getSourceHandles()` | Returns all output handle identifiers |
| `getTargetNodeFromSourceHandle(handle)` | Gets the node connected to a specific output |

## Creating a Custom Node

Let's create a custom "HttpRequest" node that makes an API call.

### Step 1: Define the Node Class

```typescript
import NodeModel from "@omega-flow/engine/engine/NodeModel";
import type { Node, Event } from "@omega-flow/types";

export default class HttpRequestNode extends NodeModel {
  constructor(node: Node) {
    super(node);
  }

  // Factory method with type validation
  static create(node: Node): HttpRequestNode {
    if (node.type !== "HttpRequest") {
      throw new Error("Node type must be HttpRequest");
    }
    return new this(node);
  }

  async acceptEvent(event: Event): Promise<boolean> {
    const data = this.getData();
    const { url, method = "GET", headers = {} } = data.params || {};

    try {
      const response = await fetch(url, {
        method,
        headers,
        body: method !== "GET" ? JSON.stringify(event.data) : undefined,
      });

      const result = await response.json();

      // Store result in state for use in nextNode or downstream nodes
      this.setState({
        success: response.ok,
        status: response.status,
        result,
      });

      return true; // Event accepted, processing complete
    } catch (error) {
      this.setState({
        success: false,
        error: error.message,
      });
      return true; // Still accepted, but with error state
    }
  }

  async nextNode(event: Event): Promise<NodeModel | null> {
    const state = this.getState();

    // Route based on success/failure
    if (state.success) {
      return this.getTargetNodeFromSourceHandle("success");
    } else {
      return this.getTargetNodeFromSourceHandle("error");
    }
  }
}
```

### Step 2: Register the Node

Add your custom node to the nodeModels map when creating the WorkflowManager:

```typescript
import {
  WorkflowManager,
  InMemoryWorkflowStore,
  InMemoryWorkflowMemory,
  InMemoryWorkflowScheduler,
  nodeModels,
} from "@omega-flow/engine";
import HttpRequestNode from "./nodes/HttpRequestNode";

// Combine default nodes with custom nodes
const allNodeTypes = {
  ...nodeModels,
  HttpRequest: HttpRequestNode,
};

const manager = new WorkflowManager({
  workflowStore: new InMemoryWorkflowStore("default", workflows),
  workflowMemory: new InMemoryWorkflowMemory(),
  workflowScheduler: new InMemoryWorkflowScheduler(),
  nodeModels: allNodeTypes,  // Use combined node types
  eventExtractor: (event) => ["default", event.data.userId],
});
```

### Step 3: Use in Workflow

Now you can use your custom node in workflow definitions:

```json
{
  "id": "http-request-1",
  "type": "HttpRequest",
  "data": {
    "label": "Call User API",
    "params": {
      "url": "https://api.example.com/users",
      "method": "POST",
      "headers": {
        "Content-Type": "application/json"
      }
    }
  },
  "position": { "x": 0, "y": 100 }
}
```

## Node Patterns

### Pass-Through Node (Like Action)

Accepts all events and immediately proceeds:

```typescript
export default class LoggerNode extends NodeModel {
  static create(node: Node): LoggerNode {
    if (node.type !== "Logger") throw new Error("Node type must be Logger");
    return new this(node);
  }

  async acceptEvent(event: Event): Promise<boolean> {
    const data = this.getData();
    console.log(`[${data.params?.level || "info"}]`, event);
    return true; // Always accept
  }

  async nextNode(event: Event): Promise<NodeModel | null> {
    // Single output - get first connection
    const handle = this.getSourceHandles()[0];
    return this.getTargetNodeFromSourceHandle(handle);
  }
}
```

### Filter Node (Like Trigger)

Only accepts specific events:

```typescript
export default class EventFilterNode extends NodeModel {
  static create(node: Node): EventFilterNode {
    if (node.type !== "EventFilter") throw new Error("Node type must be EventFilter");
    return new this(node);
  }

  async acceptEvent(event: Event): Promise<boolean> {
    const data = this.getData();
    const { eventTypes = [], dataMatches = {} } = data.params || {};

    // Check event type
    if (eventTypes.length > 0 && !eventTypes.includes(event.type)) {
      return false;
    }

    // Check data properties
    for (const [key, value] of Object.entries(dataMatches)) {
      if (event.data?.[key] !== value) {
        return false;
      }
    }

    return true;
  }

  async nextNode(event: Event): Promise<NodeModel | null> {
    const handle = this.getSourceHandles()[0];
    return this.getTargetNodeFromSourceHandle(handle);
  }
}
```

### Branching Node (Like Condition)

Routes to different paths based on logic:

```typescript
export default class SwitchNode extends NodeModel {
  static create(node: Node): SwitchNode {
    if (node.type !== "Switch") throw new Error("Node type must be Switch");
    return new this(node);
  }

  async acceptEvent(event: Event): Promise<boolean> {
    const data = this.getData();
    const { field, cases } = data.params || {};

    // Get the value to switch on
    const value = event.data?.[field];

    // Find matching case
    const matchedCase = cases?.find((c: any) => c.value === value);

    // Store result for nextNode
    this.setState({
      matchedHandle: matchedCase?.handle || "default"
    });

    return true;
  }

  async nextNode(event: Event): Promise<NodeModel | null> {
    const { matchedHandle } = this.getState();
    return this.getTargetNodeFromSourceHandle(matchedHandle);
  }
}
```

### Waiting Node (Like Wait)

Pauses until a condition is met:

```typescript
export default class WaitForDataNode extends NodeModel {
  static create(node: Node): WaitForDataNode {
    if (node.type !== "WaitForData") throw new Error("Node type must be WaitForData");
    return new this(node);
  }

  async acceptEvent(event: Event): Promise<boolean> {
    const data = this.getData();
    const { requiredField, timeout } = data.params || {};
    const state = this.getState();

    // Check if we already started waiting
    if (state.waitStartedAt) {
      // Check timeout
      if (timeout && event.time >= state.waitStartedAt + timeout) {
        this.updateState({ timedOut: true });
        return true; // Timeout reached
      }

      // Check if required data is now present
      if (event.data?.[requiredField] !== undefined) {
        this.updateState({ dataReceived: true });
        return true; // Data received
      }

      return false; // Still waiting
    }

    // First event - start waiting
    this.setState({ waitStartedAt: event.time });

    // Check if data is already present
    if (event.data?.[requiredField] !== undefined) {
      this.updateState({ dataReceived: true });
      return true;
    }

    return false; // Start waiting
  }

  async nextNode(event: Event): Promise<NodeModel | null> {
    const state = this.getState();

    if (state.timedOut) {
      return this.getTargetNodeFromSourceHandle("timeout");
    }
    return this.getTargetNodeFromSourceHandle("success");
  }
}
```

### Terminal Node (Like Exit)

Ends the workflow:

```typescript
export default class CompleteNode extends NodeModel {
  static create(node: Node): CompleteNode {
    if (node.type !== "Complete") throw new Error("Node type must be Complete");
    return new this(node);
  }

  async acceptEvent(event: Event): Promise<boolean> {
    // Optionally log completion or perform cleanup
    const data = this.getData();
    console.log("Workflow completed:", data.params?.message);
    return true;
  }

  async nextNode(event: Event): Promise<NodeModel | null> {
    return null; // Returning null ends the workflow
  }
}
```

## Accessing Services

Nodes can access shared services via `this.services`. Services are automatically injected by `WorkflowModel` during node instantiation. The `NodeServices` interface is extensible — currently it provides access to the scheduler.

### Using the Scheduler

Nodes that need to schedule future events (e.g., timeouts) can use `this.services.scheduler`:

```typescript
import NodeModel from "@omega-flow/engine/engine/NodeModel";
import type { Node, Event } from "@omega-flow/types";

export default class DelayNode extends NodeModel {
  static create(node: Node): DelayNode {
    if (node.type !== "Delay") throw new Error("Node type must be Delay");
    return new this(node);
  }

  async acceptEvent(event: Event): Promise<boolean> {
    const state = this.getState();
    const { delay } = this.getData().params || {};

    // Already waiting — check if timeout arrived
    if (state.waitStartedAt) {
      if (event.type === "system:timeout" && event.time >= state.waitStartedAt + delay) {
        return true; // Done waiting
      }
      return false; // Still waiting
    }

    // First call — schedule timeout and start waiting
    this.setState({ waitStartedAt: event.time });

    if (this.services.scheduler) {
      const timeoutEvent: Event = {
        id: `timeout_${this.getId()}_${Date.now()}`,
        type: "system:timeout",
        time: event.time + delay,
        data: event.data,
      };
      await this.services.scheduler.schedule(timeoutEvent, delay);
    }

    return false;
  }

  async nextNode(event: Event): Promise<NodeModel | null> {
    const handle = this.getSourceHandles()[0];
    return this.getTargetNodeFromSourceHandle(handle);
  }
}
```

::: tip
When no scheduler is provided (e.g., in unit tests), `this.services.scheduler` is `undefined`. Always guard access with an `if` check so nodes degrade gracefully.
:::

## State Management

Use `setState`, `getState`, and `updateState` to manage node state:

```typescript
async acceptEvent(event: Event): Promise<boolean> {
  // Get current state
  const state = this.getState();

  // Initialize state on first call
  if (!state.initialized) {
    this.setState({
      initialized: true,
      attempts: 0,
      startTime: event.time,
    });
    return false; // Wait for more events
  }

  // Update specific fields
  this.updateState({
    attempts: state.attempts + 1,
    lastAttemptTime: event.time,
  });

  // Check completion condition
  if (state.attempts >= 3) {
    return true; // Done after 3 attempts
  }

  return false; // Keep waiting
}
```

::: warning State Persistence
Node state is automatically saved as part of the workflow Context. When a workflow is resumed from persistence, the state is restored. Make sure your state is serializable (no functions, circular references, etc.).
:::

## Passing Data Between Nodes

### Via Node State

Store data in state during `acceptEvent`, access in `nextNode`:

```typescript
async acceptEvent(event: Event): Promise<boolean> {
  const result = await processData(event.data);
  this.setState({ processedData: result });
  return true;
}

async nextNode(event: Event): Promise<NodeModel | null> {
  const { processedData } = this.getState();
  // Use processedData if needed for routing decisions
  return this.getTargetNodeFromSourceHandle("next");
}
```

### Via Event Data

Nodes receive the same event that triggered them. Upstream node state can be accessed through the workflow context if needed.

## Testing Custom Nodes

```typescript
import { describe, it, expect } from "vitest";
import { WorkflowModel, nodeModels } from "@omega-flow/engine";
import HttpRequestNode from "./HttpRequestNode";

const allNodeTypes = {
  ...nodeModels,
  HttpRequest: HttpRequestNode,
};

describe("HttpRequestNode", () => {
  const workflow = {
    id: "test",
    name: "Test",
    flow: {
      nodes: [
        { id: "trigger", type: "Trigger", data: { params: { event: "start" } }, position: { x: 0, y: 0 } },
        { id: "http", type: "HttpRequest", data: { params: { url: "https://api.example.com" } }, position: { x: 0, y: 100 } },
        { id: "exit", type: "Exit", data: {}, position: { x: 0, y: 200 } },
      ],
      edges: [
        { id: "e1", source: "trigger", target: "http" },
        { id: "e2", source: "http", sourceHandle: "success", target: "exit" },
      ],
    },
    options: {},
  };

  it("should process HTTP request and continue", async () => {
    const wf = new WorkflowModel(workflow, allNodeTypes);
    wf.start();

    await wf.acceptEvent({
      id: "1",
      type: "start",
      time: Date.now(),
      data: { userId: "123" },
    });

    expect(wf.getStatus()).toBe("completed");
  });
});
```

## Built-in Node Types Reference

The engine includes these node types in `nodeModels` exported from `@omega-flow/engine`:

| Type | Description | acceptEvent | nextNode |
|------|-------------|-------------|----------|
| `Trigger` | Waits for specific event type | True if `event.type === params.event` | First connected node |
| `Action` | Pass-through action | Always true | First connected node |
| `Condition` | Evaluates rules using the shared `Conditions` format | Always true (stores result) | "true" or "false" handle |
| `Wait` | Pauses for duration | True when duration elapsed | First connected node |
| `TriggerOrTimeout` | Waits for event or timeout | True on event match or timeout | First connected node |
| `Exit` | Ends workflow | Always true | Returns null |

## Best Practices

1. **Validate node type** in the `create` factory method
2. **Use updateState** for partial state updates to preserve existing data
3. **Make state serializable** - no functions, Promises, or circular references
4. **Handle errors gracefully** - store error state instead of throwing
5. **Document handle names** - clearly name your source handles (outputs)
6. **Return false to wait** - return `false` from `acceptEvent` to keep waiting for events
7. **Return null to end** - return `null` from `nextNode` to complete the workflow
8. **Test edge cases** - test with invalid data, timeouts, and error conditions

## Next Steps

- Create the [editor-side custom node](/guide/custom-nodes) for visual representation
- Learn about [workflow execution](/guide/engine-execution)
- Explore [core concepts](/guide/core-concepts)
