# AWS Storage & Scheduler

The `@omega-flow/store-aws` package provides production-ready AWS implementations of the engine's pluggable interfaces:

| Class | Implements | Backed by |
|-------|-----------|-----------|
| `DynamoDBWorkflowStore` | `WorkflowStore` | DynamoDB |
| `DynamoDBWorkflowMemory` | `WorkflowMemory` | DynamoDB |
| `DynamoDBSubscriptionStore` | `SubscriptionStore` | DynamoDB |
| `EventBusWorkflowScheduler` | `WorkflowScheduler` | EventBridge Scheduler |

These are drop-in replacements for the `InMemory*` implementations used in development.

## Installation

```bash
pnpm add @omega-flow/store-aws @omega-flow/engine @omega-flow/types
```

The package depends on the AWS SDK v3 clients — they are included as regular dependencies.

## Quick Start

```typescript
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { SchedulerClient } from "@aws-sdk/client-scheduler";
import { WorkflowManager, defaultNodeModels } from "@omega-flow/engine";
import {
  DynamoDBWorkflowStore,
  DynamoDBWorkflowMemory,
  EventBusWorkflowScheduler,
} from "@omega-flow/store-aws";

const ddb = new DynamoDBClient({ region: "eu-west-1" });

const manager = new WorkflowManager({
  workflowStore: new DynamoDBWorkflowStore({
    client: ddb,
    tableName: "omega-workflows",
  }),
  workflowMemory: new DynamoDBWorkflowMemory({
    client: ddb,
    tableName: "omega-contexts",
  }),
  workflowScheduler: new EventBusWorkflowScheduler({
    client: new SchedulerClient({ region: "eu-west-1" }),
    eventBusArn: "arn:aws:events:eu-west-1:123456789012:event-bus/omega",
    roleArn: "arn:aws:iam::123456789012:role/OmegaSchedulerRole",
  }),
  nodeModels: defaultNodeModels,
  eventExtractor: (event) => ["default", event.data.userId],
});
```

## Required DynamoDB Tables

You need to create **two DynamoDB tables** in your AWS account — one for workflow definitions and one for execution contexts (plus an optional third one for [event subscriptions](/guide/event-subscriptions)). All use on-demand billing and a composite primary key (partition key + sort key). The exact table names are up to you — pass them via the `tableName` config option.

### Workflows Table

Stores workflow definitions. Each domain (tenant) can have many workflows.

| Attribute | Type | Key |
|-----------|------|-----|
| `domain` | String (S) | Partition key |
| `workflowId` | String (S) | Sort key |

### Contexts Table

Stores workflow execution state. Each context key (domain + workflow + subject combination) can have multiple instances.

| Attribute | Type | Key |
|-----------|------|-----|
| `contextKey` | String (S) | Partition key |
| `instanceId` | String (S) | Sort key |
| `domain` | String (S) | GSI partition key |
| `subjectId` | String (S) | GSI sort key |

The contexts table requires one **Global Secondary Index**:

| Index name | Partition key | Sort key | Projection |
|------------|--------------|----------|------------|
| `domain-subjectId-index` | `domain` (S) | `subjectId` (S) | ALL |

This GSI enables listing all contexts for a domain (`getAllContexts`) and for a specific subject (`getAllContextsForSubject`).

### Subscriptions Table (optional)

Stores cross-subject [event subscriptions](/guide/event-subscriptions). Only needed when you enable the feature by passing a `subscriptionStore` to the `WorkflowManager`.

| Attribute | Type | Key |
|-----------|------|-----|
| `subscriptionKey` | String (S) | Partition key |
| `target` | String (S) | Sort key |

Enable **DynamoDB TTL** on the `ttl` attribute — it garbage-collects orphaned subscriptions (crash between registration and context save). No GSI is needed: cleanup by instance uses the subscription keys recorded on the `Context`.

::: tip
All tables use PAY_PER_REQUEST billing mode — you only pay for what you use. The GSI index name is configurable via the `gsiName` config option (defaults to `domain-subjectId-index`).
:::

## DynamoDBWorkflowStore

Stores workflow definitions in DynamoDB.

### Config

```typescript
interface DynamoDBWorkflowStoreConfig {
  client: DynamoDBClient;
  tableName: string;
}
```

### Table Schema

| Attribute | Key | Description |
|-----------|-----|-------------|
| `domain` | Partition key (S) | Tenant identifier — e.g. an organization ID, company ID, or a fixed string like `"default"` for single-tenant setups. Maps to the `domain` parameter used throughout the engine. |
| `workflowId` | Sort key (S) | Workflow ID |
| `data` | — | Full `Workflow` JSON |
| `createdAt` | — | Epoch ms, set on first write |
| `updatedAt` | — | Epoch ms, updated on every write |

### Methods

In addition to the `WorkflowStore` interface methods (`getWorkflow`, `getAllWorkflows`), the DynamoDB store also supports:

| Method | Description |
|--------|-------------|
| `setWorkflow(domain, workflow)` | Create or update a workflow definition |
| `createWorkflow(domain, workflowData)` | Create a new workflow with an auto-generated ID. Throws `WorkflowAlreadyExistsError` on collision. |
| `deleteWorkflow(domain, workflowId)` | Delete a workflow. Returns `true` if it existed. |

## DynamoDBWorkflowMemory

Stores workflow execution contexts (per-subject state) in DynamoDB.

### Config

```typescript
interface DynamoDBWorkflowMemoryConfig {
  client: DynamoDBClient;
  tableName: string;
  gsiName?: string;  // default: "domain-subjectId-index"
}
```

| Property | Required | Description |
|----------|----------|-------------|
| `client` | Yes | DynamoDB SDK client |
| `tableName` | Yes | Name of the contexts table |
| `gsiName` | No | Name of the `domain`/`subjectId` GSI (default: `"domain-subjectId-index"`) |

### Table Schema

| Attribute | Key | Description |
|-----------|-----|-------------|
| `contextKey` | Partition key (S) | Composite key: `{domain}#{workflowId}#{subjectId}` |
| `instanceId` | Sort key (S) | Workflow instance ID |
| `domain` | GSI partition key (S) | Tenant identifier (denormalised from contextKey for GSI queries) |
| `subjectId` | GSI sort key (S) | Subject identifier (denormalised from contextKey for GSI queries) |
| `data` | — | Full `Context` JSON |
| `isCompleted` | — | Mirrored from Context for filtering |
| `startedAt` | — | Mirrored from Context for sorting |
| `updatedAt` | — | Epoch ms, updated on every save |

The composite partition key groups all instances of a workflow for a given subject together, making `getContexts` a single partition query. The `domain` and `subjectId` attributes are written alongside every item to power the GSI.

::: warning
Domain, workflow ID, and subject ID must not contain the `#` character, as it is used as the delimiter in the partition key.
:::

### Methods

The store implements the full `WorkflowMemory` interface (`getContexts`, `saveContext`, `deleteContext`) plus:

| Method | Description |
|--------|-------------|
| `getContext(domain, workflowId, subjectId, instanceId)` | Fetch a single context by instance ID. |
| `getAllContextsForSubject(domain, subjectId)` | List all contexts for a subject across all workflows. Uses the GSI. |
| `getAllContexts(domain)` | List all contexts in a domain across all subjects. Returns contexts annotated with `subjectId`. Uses the GSI. |

## DynamoDBSubscriptionStore

Stores cross-subject [event subscriptions](/guide/event-subscriptions) in DynamoDB. Pass it as `subscriptionStore` in the `WorkflowManagerConfig` to enable the feature — that is the only wiring: subscription delivery copies travel through the configured `WorkflowScheduler` (delay 0) and come back through `processEvent` like any other message. Delivery copies carry explicit top-level `domain`/`subjectId` (envelope routing), so a FIFO transport groups them with the subscriber's own events automatically.

::: tip Delivery latency and dedup with EventBridge Scheduler
Scheduler-based transports clamp near-now schedules about a minute ahead (EventBridge rejects past `at()` times), so a cross-subject delivery arrives within ~1–2 minutes — fine for waits whose timeouts span days. EventBridge's SQS target cannot set `MessageDeduplicationId`, so enable `ContentBasedDeduplication` on the queue; delivery copies are unique per subscriber (`event.delivery` differs), which gives per-instance dedup for free.
:::

### Config

```typescript
interface DynamoDBSubscriptionStoreConfig {
  client: DynamoDBClient;
  tableName: string;
}
```

### Table Schema

| Attribute | Key | Description |
|-----------|-----|-------------|
| `subscriptionKey` | Partition key (S) | Composite key: `{domain}#{eventType}#{matchSubjectId}` (`matchSubjectId` is `*` for wildcard subscriptions) |
| `target` | Sort key (S) | Composite key: `{workflowId}#{subjectId}#{instanceId}#{nodeId}` |
| `domain`, `eventType`, `matchSubjectId`, `workflowId`, `subjectId`, `instanceId`, `nodeId` | — | Denormalised subscription fields |
| `createdAt` | — | Epoch ms, set on registration |
| `ttl` | — | Epoch seconds; enable DynamoDB TTL on this attribute (orphan-cleanup safety net) |

Matching an event is two cheap exact-key Queries — one for the event's own subject id and one for wildcard subscriptions — both usually empty. Expired items are additionally filtered out of query results, since DynamoDB TTL deletion can lag.

::: warning
`domain` and `eventType` must not contain the `#` character, as it is used as the delimiter in the partition key.
:::

### Methods

The store implements the `SubscriptionStore` interface: `put(subscription)`, `match(domain, eventType, matchSubjectId)` (includes wildcard matches), and `delete(subscriptions)`.

### IAM Permissions

The caller needs:

```json
{
  "Effect": "Allow",
  "Action": [
    "dynamodb:PutItem",
    "dynamodb:Query",
    "dynamodb:DeleteItem"
  ],
  "Resource": "arn:aws:dynamodb:*:*:table/<subscriptionsTable>"
}
```

## EventBusWorkflowScheduler

Schedules delayed workflow events using [EventBridge Scheduler](https://docs.aws.amazon.com/scheduler/latest/UserGuide/what-is-scheduler.html). When a schedule fires, it publishes the event to an EventBridge bus. A downstream consumer (e.g. a Lambda) picks it up and calls `WorkflowManager.processEvent`.

Schedules are created with `ActionAfterCompletion: DELETE`, so AWS cleans them up automatically after they fire.

### Config

```typescript
interface EventBusWorkflowSchedulerConfig {
  client: SchedulerClient;
  eventBusArn: string;
  roleArn: string;
  scheduleGroupName?: string;  // default: "default"
  source?: string;             // default: "omega-flow"
  detailType?: string;         // default: "workflow.event"
}
```

| Property | Required | Description |
|----------|----------|-------------|
| `client` | Yes | AWS Scheduler SDK client |
| `eventBusArn` | Yes | ARN of the EventBridge bus that receives the scheduled event |
| `roleArn` | Yes | IAM role assumed by Scheduler to put events on the bus |
| `scheduleGroupName` | No | Schedule group name (default: `"default"`) |
| `source` | No | `Source` field on the published EventBridge event (default: `"omega-flow"`) |
| `detailType` | No | `DetailType` field on the published EventBridge event (default: `"workflow.event"`) |

### How It Works

1. A node (e.g. `Wait` or `TriggerOrTimeout`) calls `scheduler.schedule(event, delayMs)`
2. The scheduler creates a one-time EventBridge Scheduler schedule that fires at `now + delayMs`
3. When the schedule fires, it publishes the serialized `Event` to the EventBridge bus
4. A Lambda (or other consumer) subscribed to the bus deserializes the event and calls `manager.processEvent(event)`
5. The schedule auto-deletes after firing

### IAM Permissions

The scheduler role (`roleArn`) needs permission to put events on the bus:

```json
{
  "Effect": "Allow",
  "Action": "events:PutEvents",
  "Resource": "<eventBusArn>"
}
```

The caller creating schedules needs:

```json
{
  "Effect": "Allow",
  "Action": [
    "scheduler:CreateSchedule",
    "scheduler:DeleteSchedule"
  ],
  "Resource": "arn:aws:scheduler:*:*:schedule/<groupName>/*"
}
```

And `iam:PassRole` for the scheduler role.

## Mixing Implementations

You can mix AWS and in-memory implementations. For example, use DynamoDB for storage but keep the in-memory scheduler during local development:

```typescript
import { InMemoryWorkflowScheduler } from "@omega-flow/engine";
import {
  DynamoDBWorkflowStore,
  DynamoDBWorkflowMemory,
} from "@omega-flow/store-aws";

const manager = new WorkflowManager({
  workflowStore: new DynamoDBWorkflowStore({ client: ddb, tableName: "workflows" }),
  workflowMemory: new DynamoDBWorkflowMemory({ client: ddb, tableName: "contexts" }),
  workflowScheduler: new InMemoryWorkflowScheduler(),
  nodeModels: defaultNodeModels,
  eventExtractor: (event) => ["default", event.data.userId],
});
```
