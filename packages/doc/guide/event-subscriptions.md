# Event Subscriptions

Event subscriptions let a parked workflow instance be resumed by events from
**another subject space** — the "signal" pattern known from workflow engines
like Temporal (signals) or Camunda (message correlation).

## The problem they solve

The engine routes every event to exactly one subject:

```
eventExtractor(event) -> [domain, subjectId]
instance identity     =  (domain, workflowId, subjectId)
```

An instance can normally only be resumed by events that resolve to *its own*
subject. That's fine while every event in a flow is about the same entity —
a customer journey where every event carries the customer, or product
automation where every event carries the product.

It breaks the moment one flow needs events from two subject spaces:

> *"When a customer orders product X, wait until product X is updated, then
> email the customer."*

The instance lives under `client:5`, but the resuming `product.update` event
is routed to `product:456`. Without subscriptions, that event can never reach
the waiting instance.

## The concept

When an instance parks on a node that waits for an event outside its own
subject space, the engine registers a **subscription**:

> "Instance I (domain D, workflow W, subject S) wants events of type T whose
> source subject is X."

When such an event arrives, the router looks up subscribers and **delivers a
copy of the event to each subscriber**, targeted at that specific instance.

Key properties:

- **Targeted, not broadcast.** A bulk import firing thousands of
  `product.update` events touches only the instances that explicitly
  subscribed to *those products* — no O(events × instances) fan-out.
- **One subscription per parked node.** The subscription is registered when
  the instance parks and deleted as soon as it advances (event delivered,
  timeout fired, or instance completed).
- **Explicit wildcard.** A subscription without a match value ("ANY
  `product.update` in the domain") uses the same mechanism — allowed, but the
  cost is opt-in and per-instance.

## Enabling subscriptions

Subscriptions are off by default. Configure a `SubscriptionStore` on the
`WorkflowManager` to enable them — without one, nothing changes:

```typescript
import {
  WorkflowManager,
  InMemorySubscriptionStore,
  defaultNodeModels,
} from "@omega-flow/engine";

const manager = new WorkflowManager({
  workflowStore,
  workflowMemory,
  workflowScheduler,
  subscriptionStore: new InMemorySubscriptionStore(), // enables the feature
  nodeModels: defaultNodeModels,
  eventExtractor: (event) => [event.data.shop, event.data.subjectId],
});
```

Available implementations:

- `InMemorySubscriptionStore` (`@omega-flow/engine`) — tests, development
- `DynamoDBSubscriptionStore` (`@omega-flow/store-aws`) — production, see
  [AWS Storage & Scheduler](/guide/store-aws#dynamodbsubscriptionstore)
- The sample server ships a file-backed `FileSubscriptionStore`

## Declaring a cross-subject wait

`Trigger` and `TriggerOrTimeout` nodes accept an optional **`match`** section
in their params. Its presence makes the node a cross-subject wait:

```jsonc
{
  "type": "TriggerOrTimeout",
  "data": {
    "params": {
      "event": "product.update",
      "duration": 1209600000,        // give up after 14 days (ms)
      "match": {
        // Subject id of the source event to wait for. Resolved from THIS
        // instance's context at park time; omit for a wildcard subscription.
        "value": "product:{{trigger.payload.products[0].product_id}}"
      }
    }
  }
}
```

Semantics:

- **`match` absent** — today's behavior: the event must arrive in the
  instance's own subject space. Nothing changes for existing flows.
- **`match` present** — when the instance parks on this node, the engine
  registers a subscription for `(domain, event, resolvedValue)`.
- **`match.value` omitted** — wildcard subscription: any event of that type
  in the domain resumes the instance.

The `value` is a template resolved **once, at park time**, against the
instance context. Double-curly-brace placeholders are looked up in a scope where
`trigger` is the data of the event that started the instance (captured on
`context.triggerEvent`). Paths support dot notation and array indices. The
resolved value must equal the **subject id the source event is routed to**
(whatever your `eventExtractor` produces for it) — e.g. `product:456` when
product events are routed to typed `product:<id>` subjects.

If the template cannot be resolved (missing path), a warning is logged and
**no subscription is registered** — the instance can then only resume via its
own subject's events, e.g. the node's timeout.

::: warning Start triggers cannot subscribe
A start trigger has no instance or context yet, so there is nothing to
subscribe. Subscriptions are strictly a **resume** mechanism. Starting flows
from customer-less events already works by routing them to their own typed
subject space (e.g. one instance per product).
:::

## End-to-end event flow

Back-in-stock example: an instance under `client:5` parks on
`TriggerOrTimeout(event=product.update, match.value=product:456)`.

```
1. PARK      client:5 event processed; the workflow stops on the node.
             The engine resolves the match value and registers
             (domain, product.update, product:456) -> instance, and records
             the subscription on the instance's context.

2. EVENT     product.update for product 456 arrives (no customer id).
             It is routed to subject product:456 — exactly as today; any
             product-space workflows see it via processEvent.

3. MATCH     After processEvent, the consumer calls
             manager.matchSubscriptions(event) — two cheap lookups
             (exact subject + wildcard), both usually empty.

4. RELAY     For each match, manager.createDeliveryEvent(event, subscription)
             builds a copy retargeted at the subscriber:
               data.subjectId = "client:5"          // subscriber's subject
               data.delivery  = { workflowId, instanceId, nodeId,
                                  sourceSubjectId: "product:456" }
             In a distributed setup, enqueue this copy into the subscriber's
             FIFO group so it serializes with the subject's own events.

5. DELIVER   The consumer sees data.delivery and calls
               manager.deliverEvent(domain, workflowId, subjectId,
                                    instanceId, deliveryEvent)
             which loads THAT context only, lets the parked node accept the
             event, advances the workflow, saves, and deletes the node's
             subscription.
```

In a single-process setup (like the sample server) steps 3–5 run
synchronously right after `processEvent`:

```typescript
await manager.processEvent(event);

for (const subscription of await manager.matchSubscriptions(event)) {
  const deliveryEvent = manager.createDeliveryEvent(event, subscription);
  await manager.deliverEvent(
    domain,
    subscription.workflowId,
    subscription.subjectId,
    subscription.instanceId,
    deliveryEvent
  );
}
```

### Why a targeted `deliverEvent` instead of `processEvent`?

A full `processEvent` under the subscriber's subject would offer
`product.update` to every *other* workflow in the domain under `client:5` — a
workflow whose start trigger is `product.update` would happily start a bogus
instance keyed to a customer. Delivery must resume exactly one instance and
do nothing else: `deliverEvent` never starts instances.

### Why relay through a queue in distributed setups?

Resuming the subscriber inline while processing the source subject's event
means two writers can touch the subscriber's context concurrently — exactly
the lost-update problem per-subject FIFO groups exist to prevent. Re-enqueuing
the delivery into the subscriber's own group buys back serialization.

## Races and failure modes

| Race | Handling |
| --- | --- |
| Event arrives before the subscription is registered | Missed by design — same as "you weren't listening yet". The `TriggerOrTimeout` timeout is the user-facing safety net. |
| Instance completes/advances while a delivery is in flight | `deliverEvent` loads the context, sees it is completed or no longer parked on the delivery's `nodeId`, and drops the message with a log. Idempotent. |
| Crash between subscription registration and context save | The engine registers subscriptions **before** saving the context. Worst case is an orphan subscription — harmless (dropped on delivery) and TTL-cleaned — never a parked instance nobody can resume. |
| Duplicate delivery (at-least-once transports) | Deduplicate on `event.id + instanceId` in your transport; beyond that, `deliverEvent` is idempotent because the node has advanced. |
| Wildcard subscription during a bulk import | Real cost, but bounded: one delivery per (event × wildcard subscriber). Consider capping active wildcard subscriptions per domain if it becomes a problem. |
| Match value resolves to the instance's own subject | Pointless but harmless — same-space events already reach the instance through normal routing, so omit `match` in that case. |

## Subscription lifetime (TTL)

Every subscription carries a `ttl` (epoch seconds) as a **safety net against
orphans**, not the primary cleanup — the manager deletes subscriptions
explicitly when the instance advances. Built-in triggers derive it from their
`duration` plus a one-day margin, defaulting to 90 days for nodes without a
timeout. Custom nodes can hint their own lifetime via
`SubscriptionRequest.ttlSeconds`.

## Custom nodes

`getSubscription(context)` is part of the public `NodeModel` API — any custom
node can declare interest in cross-subject events by overriding it. See
[Custom Nodes for Engine → Subscribing to cross-subject events](/guide/engine-custom-nodes#subscribing-to-cross-subject-events).

## Trying it in the sample apps

The sample server seeds a cross-subject workflow (**Back in stock**) so the
scenario is one click away:

1. Start the sample server and app (`pnpm dev` in `apps/sampleServer` and
   `apps/sampleApp`), open the **Debugger** page.
2. Send `order.create` with subject `client:5` and data
   `{"payload": {"products": [{"product_id": 456}]}}` — the instance parks
   and a row appears in the **Subscriptions** panel
   (`product.update` ← `product:456`); the instance shows a **Subscribed**
   badge.
3. Send `product.update` with subject `product:456` — the submit result lists
   the delivery (`→ client:5 … resumed`), the subscription row disappears,
   and the `client:5` instance advances to completion.

The same state is available over HTTP: `GET /api/subscriptions` lists active
subscriptions, `DELETE /api/subscriptions/:id` removes one, and
`POST /api/execute/:domain` returns the `deliveries` performed for the event.

## What subscriptions deliberately do NOT do

- **No broadcast routing.** Events never fan out to "all instances in the
  domain"; only to instances that registered interest.
- **No multi-subject instances.** An instance keeps exactly one subject (its
  storage key / FIFO group). Subscriptions let it *listen* across spaces, not
  *live* in two.
- **No change to how workflows start.** Subscriptions only resume parked
  instances.
