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
| `nodeModels` | `NodeModelRegistry` | Map of node type names to their NodeModel classes (`Record<string, NodeModelClass>`) |
| `subscriptionStore` | `SubscriptionStore` *(optional)* | Storage backend for cross-subject [event subscriptions](/guide/event-subscriptions). Absent → subscriptions disabled, zero behavior change |
| `eventExtractor` | `(event: Event) => [string, string]` *(optional)* | Fallback to derive `[domain, subjectId]` from events without explicit envelope routing. Events carrying top-level `domain`/`subjectId` route by them directly (the extractor is not called); an event with neither is a routing error |

### Methods

#### processEvent

```typescript
processEvent(event: Event): Promise<ProcessEventResult>
```

Process an event — the single entry point for every incoming message:
- A subscription **delivery copy** (`event.delivery` present) resumes
  exactly the addressed instance (targeted, never starts instances)
- Any other event is routed to the workflows of its subject: active
  instances are resumed, new instances started if frequency rules allow
- With a `subscriptionStore` configured, matching subscriptions are then
  looked up and one delivery copy per subscriber is scheduled through the
  `workflowScheduler` (delay 0)

**Returns** `ProcessEventResult`:

| Property | Type | Description |
|----------|------|-------------|
| `delivered` | `boolean` *(only for delivery copies)* | Whether the target instance was resumed (`false` = dropped: gone/completed/no longer parked) |
| `deliveries` | `ScheduledDelivery[]` | Deliveries scheduled for matched subscriptions (`scheduleId`, `workflowId`, `subjectId`, `instanceId`, `nodeId`, `matchSubjectId`) |

::: details How processEvent handles subscriptions internally
The subscription pipeline is fully encapsulated — these steps are private
implementation details, listed here only to explain the observable behavior:

- **Match** — subscriptions in the event's domain, for the event's type,
  whose `matchSubjectId` equals the event's own subject id, plus wildcard
  subscriptions. Skipped when no `subscriptionStore` is configured and for
  delivery copies (a delivered copy never fans out again).
- **Delivery copy** — the matched event is retargeted at each subscriber via
  explicit envelope routing (top-level `domain`/`subjectId`, which always win
  over any `eventExtractor` — the copy is self-routing), carrying
  `event.delivery` metadata (`EventDelivery` — workflowId, instanceId,
  nodeId, sourceSubjectId). `data.subjectId` is also retargeted for
  transports that read it.
- **Targeted resume** — a delivery copy resumes exactly the addressed
  instance; it never starts new instances and never touches any other
  instance. The delivery is dropped with a log (`delivered: false`) when the
  workflow or instance is gone, the instance already completed, or it is no
  longer parked on the node recorded in `event.delivery.nodeId` — this makes
  redelivery idempotent.
:::

#### getScheduler

```typescript
getScheduler(): WorkflowScheduler
```

Returns the workflow scheduler instance.

#### getSubscriptionStore

```typescript
getSubscriptionStore(): SubscriptionStore | undefined
```

Returns the subscription store, or `undefined` when subscriptions are disabled.

### Example

```typescript
import {
  WorkflowManager,
  InMemoryWorkflowStore,
  InMemoryWorkflowMemory,
  InMemoryWorkflowScheduler,
  defaultNodeModels,
} from "@omega-flow/engine";

const manager = new WorkflowManager({
  workflowStore: new InMemoryWorkflowStore("default", workflows),
  workflowMemory: new InMemoryWorkflowMemory(),
  workflowScheduler: new InMemoryWorkflowScheduler(),
  nodeModels: defaultNodeModels,
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
new WorkflowModel(workflow: Workflow, nodeModels: NodeModelRegistry, services?: NodeServices)
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `workflow` | `Workflow` | The workflow definition to execute |
| `nodeModels` | `NodeModelRegistry` | Map of node type names to their classes |
| `services` | `NodeServices` | Optional services bag injected into all nodes |

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
import { WorkflowModel, defaultNodeModels } from "@omega-flow/engine";

// Create and start
const workflow = new WorkflowModel(workflowDef, defaultNodeModels);
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
| `services` | `NodeServices` | Services available to the node (scheduler, etc.) |

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

#### getDefaultNext

```typescript
getDefaultNext(): NodeModel | null
```

Shortcut for the single-output case — returns the node connected to the first source handle, or `null` if this node has no outgoing connections. Use it instead of `getTargetNodeFromSourceHandle(getSourceHandles()[0])` in pass-through nodes.

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

#### getSubscription

```typescript
getSubscription(context: Context): SubscriptionRequest | null
```

Declares the cross-subject [event subscription](/guide/event-subscriptions)
this node wants while the workflow is parked on it. Called by the
`WorkflowManager` after each run that leaves the workflow waiting on this
node (only when a `SubscriptionStore` is configured); the manager registers
and cleans up the subscription — nodes only declare interest.

The base implementation returns `null` (no subscription). Built-in `Trigger`
and `TriggerOrTimeout` implement it from their `params.match` section; custom
nodes can override it freely.

```typescript
interface SubscriptionRequest {
  eventType: string;    // event type to subscribe to
  matchSubjectId: string;   // source subject id, or "*" for wildcard
  ttlSeconds?: number;  // optional safety-net TTL hint
}
```

### Example

```typescript
import { NodeModel } from "@omega-flow/engine";
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
    return this.getDefaultNext();
  }
}
```

---

## NodeModelClass / NodeModelRegistry

Helper type aliases for typing custom node classes and registries.

```typescript
import type { NodeModelClass, NodeModelRegistry } from "@omega-flow/engine";

// NodeModelClass = typeof NodeModel
// NodeModelRegistry = Record<string, NodeModelClass>
```

`NodeModelRegistry` is the type accepted by `WorkflowManagerConfig.nodeModels` and `WorkflowModel`'s constructor.

---

## NodeServices

Interface for services injected into nodes by the workflow engine. This provides an extensible way to give nodes access to infrastructure without polluting the base class with individual properties.

```typescript
interface NodeServices {
  scheduler?: WorkflowScheduler;
}
```

| Property | Type | Description |
|----------|------|-------------|
| `scheduler` | `WorkflowScheduler` | Optional scheduler for nodes that need to schedule future events |

Nodes access services via `this.services`:

```typescript
if (this.services.scheduler) {
  await this.services.scheduler.schedule(event, delayMs);
}
```

When using `WorkflowManager`, services are automatically constructed and injected. When using `WorkflowModel` directly, pass services as the third constructor argument.

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

### SubscriptionStore

Interface for cross-subject [event subscription](/guide/event-subscriptions) storage. Optional — configure it via `WorkflowManagerConfig.subscriptionStore` to enable the feature.

```typescript
interface SubscriptionStore {
  put(subscription: Subscription): Promise<void>;
  match(domain: string, eventType: string, matchSubjectId: string): Promise<Subscription[]>;
  delete(subscriptions: SubscriptionRef[]): Promise<void>;
}
```

| Method | Description |
|--------|-------------|
| `put` | Register a subscription (same key + target overwrites) |
| `match` | Find subscriptions for `(domain, eventType, matchSubjectId)` **plus** wildcard (`"*"`) subscriptions; expired (`ttl`) entries excluded |
| `delete` | Delete the given subscriptions; missing entries are ignored |

```typescript
interface Subscription {
  domain: string;       // tenant
  eventType: string;    // e.g. "product.update"
  matchSubjectId: string;   // source subject id (e.g. "product:456"), "*" = wildcard
  workflowId: string;   // subscribing instance's workflow
  subjectId: string;    // subscribing instance's own subject (e.g. "client:5")
  instanceId: string;   // subscribing instance
  nodeId: string;       // parked node that declared the subscription
  createdAt: number;    // epoch ms
  ttl?: number;         // epoch seconds — orphan-cleanup safety net
}

// Identifying fields only (no createdAt/ttl)
type SubscriptionRef = Omit<Subscription, "createdAt" | "ttl">;
```

Helpers exported alongside the interface:

| Export | Description |
|--------|-------------|
| `SUBSCRIPTION_WILDCARD` | The `"*"` wildcard match subject id |
| `subscriptionKey(sub)` | `` `${domain}#${eventType}#${matchSubjectId}` `` — partition key |
| `subscriptionTarget(sub)` | `` `${workflowId}#${subjectId}#${instanceId}#${nodeId}` `` — sort key |

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

### InMemorySubscriptionStore

In-memory implementation of SubscriptionStore for development and testing. Also exposes `getAll()` and `clear()` for inspection in tests.

```typescript
new InMemorySubscriptionStore()
```

### AWS Implementations

The `@omega-flow/store-aws` package provides production-ready implementations backed by DynamoDB and EventBridge Scheduler:

| Class | Implements | Backed by |
|-------|-----------|-----------|
| `DynamoDBWorkflowStore` | `WorkflowStore` | DynamoDB |
| `DynamoDBWorkflowMemory` | `WorkflowMemory` | DynamoDB |
| `DynamoDBSubscriptionStore` | `SubscriptionStore` | DynamoDB |
| `SqsFifoWorkflowScheduler` | `WorkflowScheduler` | EventBridge Scheduler → SQS FIFO |

See the [AWS Storage & Scheduler guide](/guide/store-aws) for configuration, table schemas, and IAM setup.

---

## Built-in Node Types

Available from `@omega-flow/engine`:

```typescript
import { defaultNodeModels } from "@omega-flow/engine";
// { Trigger, Action, Condition, Wait, TriggerOrTimeout, Exit }
```

### Trigger

Waits for a specific event type.

| Config | Type | Description |
|--------|------|-------------|
| `data.params.event` | `string` | Event type to listen for |
| `data.params.match` | `{ subjectId?: string }` *(optional)* | Cross-subject wait: subscribe to events from another subject space. `subjectId` is a template (double-curly-brace placeholders) resolved against the instance context at park time; omit for wildcard. See [Event Subscriptions](/guide/event-subscriptions) |

**acceptEvent:** Returns `true` if `event.type === params.event`

**nextNode:** Returns first connected node

**getSubscription:** Built from `params.match` (null without it)

### Action

Pass-through node that accepts all events.

| Config | Type | Description |
|--------|------|-------------|
| `data.action` | `string` | Action identifier |
| `data.params` | `object` | Action parameters |

**acceptEvent:** Always returns `true`

**nextNode:** Returns first connected node

### Condition

Evaluates conditions using the built-in evaluator.

| Config | Type | Description |
|--------|------|-------------|
| `data.conditions` | `Conditions` | Rule groups in the shared `Conditions` format from `@omega-flow/types` |

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
| `data.params.match` | `{ subjectId?: string }` *(optional)* | Cross-subject wait — same contract as on `Trigger`; the subscription's TTL safety net is derived from `duration`. See [Event Subscriptions](/guide/event-subscriptions) |

**acceptEvent:** Returns `true` on matching event or timeout, recording which one resolved in state

**nextNode:** Returns node from `"trigger"` or `"timeout"` handle based on which path resolved

**getSubscription:** Built from `params.match` (null without it)

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
- `ContextSubscription`
- `NodeState`
- `Event`
- `EventDelivery`
- `Node`
- `Edge`
- `WorkflowHistoryItem`
