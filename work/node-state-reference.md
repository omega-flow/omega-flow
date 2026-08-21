# Dynamic Values — Node State References

**Date:** 2026-07-10 (revised same day after user testing — see "Revision" at
the end)
**Status:** Implemented, all tests passing (155 engine + 46 store-aws)

Nodes can now read data produced elsewhere in the workflow through three
dynamic sources, usable in condition facts, condition values, action params
and subscription match templates:

| Source | Prefix / template | Contents |
| --- | --- | --- |
| Current event | `event.` / `{{event.path}}` | `data` of the event being processed |
| Trigger event | `trigger.` / `{{trigger.path}}` | `data` of the event that started the instance |
| Node state | `state.<name>.` / `{{state.<name>.path}}` | any node's saved state, by node name or node id |

Example: an Action named `fetch` pulls data and saves it; a later Condition
routes on `state.fetch.resolvedParams.price greaterThan 100`.

## Engine changes (`packages/engine`)

### New: resolution scope — `src/engine/resolutionScope.ts`
- `ResolutionScope` = `{ event, trigger, state }`.
- `buildResolutionScope(nodes, event, triggerEvent)` keys `state` by node id,
  then layers node names on top. **Ambiguous names (shared by 2+ nodes) are
  not bound at all** — a template can never silently read the wrong node's
  state; node id always works as fallback.
- `WorkflowModel.acceptEvent` sets a scope *provider* on the current node
  before each `acceptEvent`/`nextNode` call. Provider (not snapshot) ⇒ state
  written earlier **in the same event's processing chain** is visible to the
  next node (Action → Condition in one chain works). Before the start node
  fires, the current event doubles as the trigger candidate.

### `NodeModel` (base class — custom nodes inherit everything)
- `getName()` — `data.name` → node type → node id.
- `getScope()` — current scope; empty scope outside a workflow run.
- `resolveValue(value)` — template-aware, type-preserving single value.
- `resolveParams()` — `data.params` deep-resolved; never mutates the definition.

### `templateResolver.ts` (new exports, `resolveTemplate` untouched)
- `resolveValue` — a string that is *exactly one* placeholder keeps the
  resolved value's type (`"{{event.price}}"` → number `42`); embedded
  placeholders stringify; missing paths → `undefined`.
- `resolveDeep` — walks objects/arrays, resolves every string leaf.
- `resolvePath` — dot notation + `[0]` indices, now exported.

### `ConditionModel` / `conditionEvaluator`
- Facts prefixed `event.` / `trigger.` / `state.` resolve against the scope
  (explicit prefix check — no key-collision risk with event payloads).
- **Unprefixed facts keep the legacy meaning** (current event's `data`) —
  existing workflows are fully backward compatible.
- Rule `value` may be a template, enabling typed comparisons between two
  dynamic values (e.g. `event.price` equal `{{state.fetch.resolvedParams.price}}`).

### `ActionModel`
- When `data.params` exists, resolves all templates on `acceptEvent` and
  saves the result to its own state as `resolvedParams` — the read surface
  for executors and downstream nodes: `state.<actionName>.resolvedParams.<field>`.

### Subscriptions (`subscriptionMatch.ts`, Trigger, TriggerOrTimeout)
- `match.subjectId` templates now resolve from `state.` in addition to
  `trigger.` (state scope passed from the parked node's `getSubscription`).

### New public exports (`src/index.ts`)
`ResolutionScope`, `buildResolutionScope`, `emptyResolutionScope`,
`resolveValue`, `resolveDeep`, `resolvePath`.

## Editor changes (`packages/editor`)

### Node names (built-in for all nodes, including custom)
- `data.name` convention; `DetailPanel` renders a Name field above every
  node's detail component — custom node authors do nothing.
- New nodes get a unique default name from their type ("Action", "Action 2")
  via `addNode` in `WorkflowEditorContext`.
- Duplicate rename shows an inline error (`panels.detail.nameDuplicate`).
- `BaseNodeView` displays `data.name` on the canvas, falling back to the
  type label.
- Helpers `getNodeName` / `uniqueNodeName` in `src/utils/nodeName.ts`
  (exported; mirror the engine's `getName()` semantics).

### New primitive: `DynamicValueField` / `DynamicValueInput`
- `src/primitives/DynamicValueField.tsx`, exported for custom node details.
- Literal-or-template text input; "dynamic" badge + accent border when the
  value contains `{{…}}`; picker inserts `{{event.}}`, `{{trigger.}}` or
  `{{state.<nodeName>.}}` (node list from the editor context; degrades
  gracefully outside a provider via `useOptionalWorkflowEditorContext`).
- Adopted in the condition builder's free-text fact + value inputs
  (`ConditionRow`) and the subscription match subject id
  (`SubscriptionMatchFields`). Action params `JsonField` hint documents the
  template syntax.
- New theme vars with light/dark values: `--of-color-accent`,
  `--of-color-accent-bg` (also in `themeVars.color.accent/accentBg`).
- New i18n keys: `panels.detail.name*`, `fields.dynamicValue.*`.

## Tests

- `test/engine/WorkflowModel.DynamicValues.test.ts`:
  same-event chain (Action writes → Condition reads, by name and by id);
  cross-event + persistence round-trip (state/trigger/event/legacy facts,
  template rule value); false path routing; ambiguous default names not bound.
- `test/engine/templateResolver.test.ts`: `resolveValue` typing rules,
  `resolveDeep` object/array walking.

## Docs

- New guide: `packages/doc/guide/dynamic-values.md` (in sidebar under
  Workflow Engine).
- API additions: `api/engine.md` (`getName`/`getScope`/`resolveValue`/
  `resolveParams`), `api/primitives.md` (`DynamicValueField`).
- Note: VitePress treats inline-code `{{…}}` as Vue interpolation — keep
  brace templates inside fenced code blocks in docs prose.

## Revision (after user testing, same day)

Three design changes on top of the original implementation:

### 1. Node ids are the only reference format; names are display-only
- Engine `buildStateScope` keys state **by node id only** — name binding
  removed entirely. Renaming can never break (or accidentally change) a
  template. `NodeModel.getName()` remains but is documented as display-only.
- Removed with it: name-uniqueness requirements, the duplicate-name error in
  the panel, and the "ambiguous names skipped" rule. `uniqueNodeName` is
  still used to give new nodes friendly distinct defaults ("Action 2"), but
  nothing depends on uniqueness.
- Test updated to pin the new behavior: a named node's state is NOT
  addressable by name, only by id.

### 2. Inline rename in the DetailPanel header
- The separate Name `TextField` is gone. The panel header now shows the
  display name; hovering reveals a pencil (✎), click edits inline,
  Enter/blur commits, Escape cancels; the edit is abandoned when selection
  changes. Type label stays as a small secondary line (`showNodeType`).
- i18n: `panels.detail.name*` keys replaced by `panels.detail.renameTitle`.

### 3. Declared state fields (`stateFields` on `NodeTypeDefinition`)
- New editor type `StateFieldDefinition` = `{ path, label?, labelKey?,
  type? }`; `NodeTypeDefinition.stateFields` accepts a static array **or a
  function of the node** (for config-dependent fields).
- Built-ins declare: Action → `resolvedParams.<key>` per configured param
  (function form); Condition → `conditionResult: boolean`; TriggerOrTimeout
  → `resolvedBy: string`; Wait → `waitStartsAt`/`waitEndsAt: number`.
- Helpers `getStateFields` / `getStateFieldLabel` in
  `src/utils/stateFields.ts` (exported).
- `DynamicValueInput` picker is now **two-level**: event / trigger /
  node list (by display name) → drill into the node's declared fields;
  picking one inserts a complete `{{state.<nodeId>.<path>}}`; a
  "Custom path…" entry inserts `{{state.<nodeId>.}}` for undeclared fields.
  New i18n keys: `fields.dynamicValue.customPath`, `.back`.

## Known limitations / follow-ups

- Raw node ids are visible inside template strings in the input. Follow-up
  idea: token/chip-style input rendering the id segment as the node's
  display name (easy to add now that ids are the storage format).
- Event envelope fields (`subjectId`, `type`, `time`) are not exposed in the
  scope — only `data`. If needed later, add under a reserved prefix (e.g.
  `eventMeta.`) without breaking existing templates.
- `stateFields.type` is carried but not yet used for filtering (e.g. a
  numeric input could offer only `type: "number"` fields).
