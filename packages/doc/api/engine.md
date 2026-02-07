# Engine API

API reference for the `@omega-flow/engine` package.

## WorkflowManager

Top-level orchestrator that manages multiple workflows across domains and subjects.

### Constructor

```typescript
new WorkflowManager(config: WorkflowManagerConfig)
```

### WorkflowManagerConfig

| Property | Type | Description |
|----------|------|-------------|
| `workflowStore` | `WorkflowStore` | Storage backend for workflow definitions |
| `workflowMemory` | `WorkflowMemory` | Storage backend for workflow execution contexts |
| `workflowScheduler` | `WorkflowScheduler` | Scheduler for time-based events |
| `nodeModels` | `Record<string, typeof NodeModel>` | Map of node type names to their NodeModel classes |
| `eventExtractor` | `(event: Event) => [string, string]` | Function to extract `[domain, subjectId]` from events |

### Methods

#### processEvent

```typescript
processEvent(event: Event): Promise<void>
```

Process an event by routing it to appropriate workflow instances. This method:
- Extracts domain and subject ID from the event
- Loads all workflows for the domain
- Resumes active workflow instances with the event
- Starts new instances if allowed by frequency rules

#### getScheduler

```typescript
getScheduler(): WorkflowScheduler
```

Returns the workflow scheduler instance.

### Example

```typescript
import {
  WorkflowManager,
  InMemoryWorkflowStore,
  InMemoryWorkflowMemory,
  InMemoryWorkflowScheduler,
} from "@omega-flow/engine";
import nodeTypes from "@omega-flow/engine/nodes";

const manager = new WorkflowManager({
  workflowStore: new InMemoryWorkflowStore("default", workflows),
  workflowMemory: new InMemoryWorkflowMemory(),
  workflowScheduler: new InMemoryWorkflowScheduler(),
  nodeModels: nodeTypes,
  eventExtractor: (event) => ["default", event.data.userId],
});

await manager.processEvent({
  id: "evt-1",
  type: "user.signup",
  time: Date.now(),
  data: { userId: "user-123" }
});
```

---

## WorkflowModel

Executes a single workflow instance. Manages the lifecycle of workflow execution including state transitions and event processing.

### Constructor

```typescript
new WorkflowModel(workflow: Workflow, nodeModels: Record<string, typeof NodeModel>)
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `workflow` | `Workflow` | The workflow definition to execute |
| `nodeModels` | `Record<string, typeof NodeModel>` | Map of node type names to their classes |

### Properties

| Property | Type | Description |
|----------|------|-------------|
| `workflow` | `Workflow` | The workflow definition |
| `nodes` | `NodeModel[]` | Instantiated node models |
| `edges` | `EdgeModel[]` | Edge models connecting nodes |
| `currentNode` | `NodeModel \| null` | Node currently waiting for events |
| `history` | `WorkflowHistoryItem[]` | Execution history |
| `status` | `WorkflowStatus` | Current execution status |
| `instanceId` | `string` | Unique instance identifier |
| `startedAt` | `number` | Start timestamp (ms) |

### Methods

#### start

```typescript
start(): void
```

Starts or resumes workflow execution. If no context was set, starts from the beginning. If a context was set via `setContext()`, resumes from the saved position.

**Throws:** Error if workflow is already running or completed.

#### acceptEvent

```typescript
acceptEvent(event: Event): Promise<void>
```

Processes an incoming event through the workflow. Passes the event to the current node and handles transitions. Recursively processes through subsequent nodes until a node doesn't accept the event or the workflow completes.

**Throws:** Error if workflow is not in waiting status.

#### getContext

```typescript
getContext(): Context
```

Exports the current workflow state as a Context object for persistence.

#### setContext

```typescript
setContext(context: Context): void
```

Restores workflow state from a previously saved context. Call `start()` after this to begin processing events.

**Throws:** Error if workflow is already running or context is invalid.

#### getStatus

```typescript
getStatus(): WorkflowStatus
```

Returns the current execution status.

#### getCurrentNode

```typescript
getCurrentNode(): NodeModel | null
```

Returns the current node waiting for events.

**Throws:** Error if workflow is not running.

#### getStartNode

```typescript
getStartNode(): NodeModel | null
```

Returns the start node (node with no incoming edges).

#### getNode

```typescript
getNode(nodeId: string | null): NodeModel | null
```

Finds a node by its ID.

### Example

```typescript
import { WorkflowModel } from "@omega-flow/engine";
import nodeTypes from "@omega-flow/engine/nodes";

// Create and start
const workflow = new WorkflowModel(workflowDef, nodeTypes);
workflow.start();

// Process event
await workflow.acceptEvent({
  id: "evt-1",
  type: "trigger-event",
  time: Date.now(),
  data: {}
});

// Check status
console.log(workflow.getStatus()); // "waiting" | "completed"

// Save state
const context = workflow.getContext();
// ... persist context ...

// Later, restore and continue
const workflow2 = new WorkflowModel(workflowDef, nodeTypes);
workflow2.setContext(savedContext);
workflow2.start();
await workflow2.acceptEvent(nextEvent);
```

---

## NodeModel

Base class for all workflow node types. Subclasses implement specific node behaviors.

### Constructor

```typescript
new NodeModel(node: Node)
```

### Properties

| Property | Type | Description |
|----------|------|-------------|
| `node` | `Node` | The underlying node definition |
| `connections` | `Connection[]` | Outgoing connections to other nodes |
| `state` | `any` | Internal state for cross-method data sharing |

### Methods

#### Static: create

```typescript
static create(node: Node): NodeModel
```

Factory method to create a node instance. Subclasses should override for type validation.

#### getId

```typescript
getId(): string
```

Returns the node's unique identifier.

#### getData

```typescript
getData(): any
```

Returns the node's data payload (params, configuration).

#### getState

```typescript
getState(): any
```

Gets the node's internal state.

#### setState

```typescript
setState(state: any): void
```

Replaces the node's internal state.

#### updateState

```typescript
updateState(changes: any): void
```

Merges changes into existing state (shallow merge).

#### connect

```typescript
connect(targetNode: NodeModel, edge: EdgeModel): void
```

Connects this node to a target node via an edge.

#### getConnections

```typescript
getConnections(): Connection[]
```

Returns all outgoing connections.

#### getSourceHandles

```typescript
getSourceHandles(): string[]
```

Returns all source handle (output) identifiers.

#### getTargetNodeFromSourceHandle

```typescript
getTargetNodeFromSourceHandle(sourceHandle: string): NodeModel | null
```

Gets the node connected to a specific output handle.

#### acceptEvent (abstract)

```typescript
acceptEvent(event: Event): Promise<boolean>
```

Processes an incoming event. Must be overridden by subclasses.

**Returns:** `true` if event is accepted and processing is complete, `false` if still waiting.

#### nextNode (abstract)

```typescript
nextNode(event: Event): Promise<NodeModel | null>
```

Determines the next node to execute. Must be overridden by subclasses.

**Returns:** The next NodeModel, or `null` to end the workflow.

### Example

```typescript
import NodeModel from "@omega-flow/engine/engine/NodeModel";
import type { Node, Event } from "@omega-flow/types";

class MyCustomNode extends NodeModel {
  static create(node: Node): MyCustomNode {
    if (node.type !== "MyCustom") {
      throw new Error("Node type must be MyCustom");
    }
    return new this(node);
  }

  async acceptEvent(event: Event): Promise<boolean> {
    const data = this.getData();
    if (event.type === data.params.triggerEvent) {
      this.setState({ processed: true });
      return true;
    }
    return false;
  }

  async nextNode(event: Event): Promise<NodeModel | null> {
    const handle = this.getSourceHandles()[0];
    return this.getTargetNodeFromSourceHandle(handle);
  }
}
```

---

## Storage Interfaces

### WorkflowStore

Interface for workflow definition storage.

```typescript
interface WorkflowStore {
  getWorkflow(domain: string, workflowId: string): Promise<Workflow | null>;
  getAllWorkflows(domain: string): Promise<Workflow[]>;
}
```

| Method | Description |
|--------|-------------|
| `getWorkflow` | Retrieve a workflow definition by ID |
| `getAllWorkflows` | Get all workflow definitions for a domain |

### WorkflowMemory

Interface for workflow execution state storage.

```typescript
interface WorkflowMemory {
  getContexts(domain: string, workflowId: string, subjectId: string): Promise<Context[]>;
  saveContext(domain: string, workflowId: string, subjectId: string, context: Context): Promise<void>;
  deleteContext(domain: string, workflowId: string, subjectId: string, instanceId: string): Promise<void>;
}
```

| Method | Description |
|--------|-------------|
| `getContexts` | Get all contexts for a workflow and subject |
| `saveContext` | Save a workflow context |
| `deleteContext` | Delete a specific workflow instance context |

### WorkflowScheduler

Interface for scheduling future events.

```typescript
interface WorkflowScheduler {
  schedule(event: Event, delayMs: number): Promise<string>;
  cancel(scheduleId: string): Promise<boolean>;
}
```

| Method | Description |
|--------|-------------|
| `schedule` | Schedule an event to be delivered after a delay |
| `cancel` | Cancel a scheduled event |

---

## Built-in Implementations

### InMemoryWorkflowStore

In-memory implementation of WorkflowStore for development and testing.

```typescript
new InMemoryWorkflowStore(domain: string, workflows: Workflow[])
```

### InMemoryWorkflowMemory

In-memory implementation of WorkflowMemory for development and testing.

```typescript
new InMemoryWorkflowMemory()
```

### InMemoryWorkflowScheduler

In-memory implementation of WorkflowScheduler using setTimeout.

```typescript
new InMemoryWorkflowScheduler()
```

---

## Built-in Node Types

Available from `@omega-flow/engine/nodes`:

```typescript
import nodeTypes from "@omega-flow/engine/nodes";
// { Trigger, Action, Condition, Wait, TriggerOrTimeout, Exit }
```

### Trigger

Waits for a specific event type.

| Config | Type | Description |
|--------|------|-------------|
| `data.params.event` | `string` | Event type to listen for |

**acceptEvent:** Returns `true` if `event.type === params.event`

**nextNode:** Returns first connected node

### Action

Pass-through node that accepts all events.

| Config | Type | Description |
|--------|------|-------------|
| `data.action` | `string` | Action identifier |
| `data.params` | `object` | Action parameters |

**acceptEvent:** Always returns `true`

**nextNode:** Returns first connected node

### Condition

Evaluates conditions using json-rules-engine.

| Config | Type | Description |
|--------|------|-------------|
| `data.conditions` | `object` | json-rules-engine conditions |

**acceptEvent:** Always returns `true`, stores result in state

**nextNode:** Returns node from `"true"` or `"false"` handle based on evaluation

### Wait

Pauses workflow for a duration.

| Config | Type | Description |
|--------|------|-------------|
| `data.params.duration` | `number` | Wait duration in milliseconds |

**acceptEvent:** Returns `false` while waiting, `true` when duration elapsed

**nextNode:** Returns first connected node

### TriggerOrTimeout

Waits for event or timeout, whichever comes first.

| Config | Type | Description |
|--------|------|-------------|
| `data.params.event` | `string` | Event type to listen for |
| `data.params.duration` | `number` | Timeout duration in milliseconds |

**acceptEvent:** Returns `true` on matching event or timeout

**nextNode:** Returns first connected node

### Exit

Terminates the workflow.

**acceptEvent:** Always returns `true`

**nextNode:** Always returns `null`

---

## Enums

### WorkflowStatus

```typescript
enum WorkflowStatus {
  Idle = "idle",
  Waiting = "waiting",
  Processing = "processing",
  Transforming = "transforming",
  Completed = "completed"
}
```

| Value | Description |
|-------|-------------|
| `idle` | Workflow created but not started |
| `waiting` | Running, waiting for events |
| `processing` | Currently handling an event |
| `transforming` | Moving between nodes |
| `completed` | Workflow finished |

---

## Types

See [Types Reference](/api/types) for complete type definitions including:

- `Workflow`
- `WorkflowOptions`
- `WorkflowFrequency`
- `Context`
- `NodeState`
- `Event`
- `Node`
- `Edge`
- `WorkflowHistoryItem`
