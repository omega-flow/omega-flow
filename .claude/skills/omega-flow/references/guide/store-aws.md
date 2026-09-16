# AWS Storage & Scheduler

The `@omega-flow/store-aws` package provides production-ready AWS implementations of the engine's pluggable interfaces:

| Class | Implements | Backed by |
|-------|-----------|-----------|
| `DynamoDBWorkflowStore` | `WorkflowStore` | DynamoDB |
| `DynamoDBWorkflowMemory` | `WorkflowMemory` | DynamoDB |
| `DynamoDBSubscriptionStore` | `SubscriptionStore` | DynamoDB |
| `SqsFifoWorkflowScheduler` | `WorkflowScheduler` | EventBridge Scheduler → SQS FIFO |

These are drop-in replacements for the `InMemory*` implementations used in development.

## Suggested Choice

Why DynamoDB and SQS FIFO + EventBridge Scheduler, and not a relational database and a job runner? Because the engine's own model maps onto these services almost one-to-one:

- **DynamoDB** — every access the engine makes is an exact-key read or write: definitions by `(domain, workflowId)`, contexts by `(contextKey, instanceId)`, subscriptions by their composite match key. There are no joins, no scans, no ad-hoc queries — so a key-value store gives single-digit-millisecond access with nothing wasted. Partition keys give free per-tenant isolation, conditional writes power the optimistic-locking guard on context saves, DynamoDB TTL garbage-collects orphaned subscriptions, and on-demand billing means an idle workflow system costs nothing.
- **SQS FIFO** — the engine's concurrency model is *one writer per subject*: all events for a subject must be processed in order, one at a time, while different subjects proceed in parallel. That is precisely what a FIFO queue's `MessageGroupId` provides (group = `${domain}#${subjectId}`) — ordering and serialization per subject without locks. With a Lambda event source you also get batching, retries, DLQ routing, and partial-batch failure handling for free, and a poison message blocks only its own group.
- **EventBridge Scheduler** — `Wait` nodes and timeouts need one-time timers at arbitrary future moments, potentially millions of them. EventBridge Scheduler holds them without any polling infrastructure, self-deletes each schedule after it fires, and delivers straight into the same FIFO queue with the same message group — so a timer wake-up stays serialized behind the subject's live events instead of racing them.

All three are serverless and pay-per-use, so the whole runtime scales to zero with your traffic. That said, nothing in the engine requires AWS — `WorkflowStore`, `WorkflowMemory`, `WorkflowScheduler`, and `SubscriptionStore` are plain interfaces, and any backend with exact-key lookups, per-key serialized delivery, and delayed messages can implement them.

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
  SqsFifoWorkflowScheduler,
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
  workflowScheduler: new SqsFifoWorkflowScheduler({
    client: new SchedulerClient({ region: "eu-west-1" }),
    queueArn: "arn:aws:sqs:eu-west-1:123456789012:omega-events.fifo",
    roleArn: "arn:aws:iam::123456789012:role/OmegaSchedulerRole",
    // Must mirror the producer's MessageGroupId and the eventExtractor below.
    messageGroupIdExtractor: (event) => `default#${event.data.userId}`,
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

::: tip Delivery transport with `SqsFifoWorkflowScheduler`
Delivery copies are scheduled with delay 0, which takes the scheduler's **immediate-send fast path**: a direct `sqs:SendMessage` with an explicit per-subscriber `MessageDeduplicationId` — no EventBridge schedule, no minute-granularity latency, no CreateSchedule TPS pressure under wildcard match storms. Two requirements: the **caller's** IAM role needs `sqs:SendMessage` on the queue (the scheduler's `roleArn` only covers delayed schedules), and the queue should still run `ContentBasedDeduplication` for the delayed path (EventBridge's SQS target cannot set a dedup id).
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

## SqsFifoWorkflowScheduler

Schedules delayed workflow events using [EventBridge Scheduler](https://docs.aws.amazon.com/scheduler/latest/UserGuide/what-is-scheduler.html) targeting an SQS **FIFO** queue directly. Scheduled events land on the *same* FIFO queue as your ordinary events, with the *same* `MessageGroupId` — so a `Wait` wake-up or a `TriggerOrTimeout` timeout stays strictly ordered and serialized with the live events for the same subject. A downstream consumer (typically a Lambda on the queue) deserializes each message and calls `WorkflowManager.processEvent`.

### Config

```typescript
interface SqsFifoWorkflowSchedulerConfig {
  client: SchedulerClient;
  queueArn: string;
  roleArn: string;
  scheduleGroupName?: string;                              // default: "default"
  sqsClient?: SQSClient;                                   // default: derived from queueArn region
  queueUrl?: string;                                       // default: derived from queueArn
  messageGroupIdExtractor?: (event: Event) => string;
  messageDeduplicationIdExtractor?: (event: Event) => string;
}
```

| Property | Required | Description |
|----------|----------|-------------|
| `client` | Yes | AWS Scheduler SDK client |
| `queueArn` | Yes | ARN of the target SQS **FIFO** queue (must end with `.fifo`) |
| `roleArn` | Yes | IAM role assumed by EventBridge Scheduler to `sqs:SendMessage` to the queue |
| `scheduleGroupName` | No | Schedule group name (default: `"default"`) |
| `sqsClient` | No | SQS client for the immediate-send fast path (default: a client in the queue's region) |
| `queueUrl` | No | Queue URL for the fast path (default: derived from `queueArn`; set explicitly for non-standard partitions/endpoints) |
| `messageGroupIdExtractor` | No | Derives the FIFO `MessageGroupId` for events without envelope routing — see below |
| `messageDeduplicationIdExtractor` | No | Derives the FIFO `MessageDeduplicationId` for the fast path — see below |

### Two Delivery Paths

The scheduler picks a path by delay:

- **Immediate send (`delayMs` < 1 s)** — used for [subscription delivery copies](/guide/event-subscriptions): a direct `sqs:SendMessage` to the queue. No EventBridge resource is created, there is no minute-granularity latency, and a burst of matches (e.g. a wildcard subscription during a bulk import) creates no `CreateSchedule` TPS pressure. `cancel()` returns `false` for these — the message is already on the queue.
- **Real delays (`Wait` wake-ups, timeouts)** — a one-time EventBridge schedule with `ActionAfterCompletion: DELETE` (auto-cleans after firing), clamped to fire **at least 1 minute ahead**: EventBridge rejects `at()` times in the past, and FIFO queues do not support per-message `DelaySeconds`, so even short delays must be schedules. Firing late is safer than firing early.

### MessageGroupId

The FIFO group is resolved **envelope-first**, matching the engine's routing precedence:

1. When the event carries top-level `domain` and `subjectId` (explicit envelope routing — e.g. subscription delivery copies created by the engine), the group is `${event.domain}#${event.subjectId}`. The extractor is never called.
2. Otherwise `messageGroupIdExtractor(event)` is used. It **must** produce the same key your event producer and the consumer's `eventExtractor` use (`${domain}#${subjectId}`), or a wake-up and a live event for the same subject would land in different groups and lose their ordering guarantee.
3. An event with neither is an error.

### Deduplication

- The **immediate-send path** sets an explicit `MessageDeduplicationId`. The default is delivery-aware: `${event.id}#${delivery.instanceId}#${delivery.nodeId}` for subscription delivery copies — two copies of one source event addressed at different subscribers must **not** dedup each other — and plain `event.id` otherwise.
- The **EventBridge path** cannot set a dedup id (the SQS target does not expose it), so the queue must have `ContentBasedDeduplication` enabled.

### Queue Requirements

```
FifoQueue: true
ContentBasedDeduplication: true        # EventBridge target can't set a dedup id
DeduplicationScope: messageGroup
FifoThroughputLimit: perMessageGroupId
VisibilityTimeout: >= 6x consumer timeout
```

### IAM Permissions

The scheduler role (`roleArn`, assumed by EventBridge Scheduler) needs:

```json
{
  "Effect": "Allow",
  "Action": "sqs:SendMessage",
  "Resource": "<queueArn>"
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

plus `iam:PassRole` for the scheduler role, **and** — because the immediate-send fast path bypasses EventBridge — `sqs:SendMessage` on the queue for the caller itself (the `roleArn` only covers the delayed path).

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
