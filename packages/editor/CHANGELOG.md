# @omega-flow/editor

## 0.2.0

### Minor Changes

- [#43](https://github.com/omega-flow/omega-flow/pull/43) [`1de8d8d`](https://github.com/omega-flow/omega-flow/commit/1de8d8d36ecb241ece8b931ed09313bf4a84412b) Thanks [@fones](https://github.com/fones)! - Add **event subscriptions** — cross-subject event routing (the classic workflow-engine "signal" pattern). An instance parked on a trigger node can now wait for events from _another_ subject space (e.g. a `client:5` journey waiting for `product:456`'s `product.update`), which strict per-subject routing previously made impossible.

  - **Engine**: when a `Trigger`/`TriggerOrTimeout` node with a `match` section parks, the manager registers a subscription `(domain, eventType, matchSubjectId)`; `match.subjectId` is a template (e.g. `"product:{{trigger.payload.products[0].product_id}}"`) resolved once at park time against the instance's trigger event — omit it for an explicit wildcard. `processEvent(event)` remains the host's single entry point: it routes the event normally, matches it against subscriptions, and relays one targeted **delivery copy** per subscriber through the `workflowScheduler` (delay 0), so copies re-enter in the subscriber's own FIFO group. A delivery copy resumes exactly the addressed instance (never starts new ones; redelivery is idempotent). Subscriptions are diffed on every context save (put before save, delete after) and mirrored on `context.subscriptions`; crash windows leave only TTL-cleaned orphans, never a deaf instance. Custom nodes can declare interest via the new overridable `NodeModel.getSubscription(context)`. New: `SubscriptionStore` interface + `InMemorySubscriptionStore`, `matchSubscriptions`, `createDeliveryEvent`, `deliverEvent`, `getSubscriptionStore`; `WorkflowManagerConfig.subscriptionStore` (presence enables the feature — absent means zero behavior change).
  - **Types**: events gained optional envelope routing fields — `Event.domain`, `Event.subjectId`, and the engine-authored `Event.delivery` (`EventDelivery`). Explicit envelope fields always win over the `eventExtractor`, which is now **optional** config; delivery copies therefore route themselves regardless of how the host derives routing, and payload contents can never impersonate a delivery copy.
  - **store-aws**: new `DynamoDBSubscriptionStore` (pk `subscriptionKey`, sk `target`, no GSI; enable DynamoDB TTL on `ttl` as the orphan-cleanup safety net). `SqsFifoWorkflowScheduler` doubles as the delivery transport: sub-second delays (all subscription deliveries) take an immediate `sqs:SendMessage` fast path with a delivery-aware `MessageDeduplicationId` (`event.id#instanceId#nodeId`, so two copies of one source event never dedup each other) instead of creating an EventBridge schedule; `MessageGroupId` is envelope-first. Callers need `sqs:SendMessage` on the queue for the fast path. DynamoDB document clients now marshal with `removeUndefinedValues: true`.
  - **Editor**: trigger-node inspectors (non-start only) gained the match UI — a subject-id template input with wildcard-cost copy and validation (no `match` on start triggers, warn when the match targets the node's own subject space).

- [`1e3100d`](https://github.com/omega-flow/omega-flow/commit/1e3100d16b392e28986da52563a8be42204bf2a7) Thanks [@fones](https://github.com/fones)! - Localize the `NodesPanel` palette. The panel now resolves each node type's display name and description through the editor's translation function instead of rendering the raw `label`/`description`, so the existing `nodeTypes.*` translation keys finally reach the palette. Adds optional `labelKey`/`descriptionKey` fields to `NodeTypeDefinition` (set on all `defaultNodeTypes`); both fall back to the raw `label`/`description` when the key is unset or has no registered translation, so custom nodes and untranslated setups are unaffected.

### Patch Changes

- Updated dependencies [[`27c74ec`](https://github.com/omega-flow/omega-flow/commit/27c74ecf2990604a1421aa6274879c2380c52568), [`1de8d8d`](https://github.com/omega-flow/omega-flow/commit/1de8d8d36ecb241ece8b931ed09313bf4a84412b), [`27c74ec`](https://github.com/omega-flow/omega-flow/commit/27c74ecf2990604a1421aa6274879c2380c52568)]:
  - @omega-flow/types@0.2.0

## 0.1.1

### Patch Changes

- [#25](https://github.com/omega-flow/omega-flow/pull/25) [`6b560f7`](https://github.com/omega-flow/omega-flow/commit/6b560f7debce16c9c3fc083c4139c048d5c59b44) Thanks [@fones](https://github.com/fones)! - Add per-package README files so each package displays documentation on npm.

- Updated dependencies [[`6b560f7`](https://github.com/omega-flow/omega-flow/commit/6b560f7debce16c9c3fc083c4139c048d5c59b44)]:
  - @omega-flow/types@0.1.1
