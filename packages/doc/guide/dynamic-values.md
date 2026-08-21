# Dynamic Values

Dynamic values let one node read data produced elsewhere in the workflow —
another node's saved state, the event currently being processed, or the event
that started the instance. They work in condition facts, condition values,
action parameters and subscription match templates, and they are available to
custom nodes through built-in `NodeModel` helpers.

## The resolution scope

While an event is processed, every node call sees a **resolution scope** with
three sources:

| Source | Path prefix | Contents |
| --- | --- | --- |
| Current event | `event.` | `data` of the event being processed right now |
| Trigger event | `trigger.` | `data` of the event that started this instance |
| Node state | `state.<nodeId>.` | Any node's saved state, keyed by node id |

Paths use dot notation with optional array indices, e.g.
`trigger.products[0].product_id`. The scope is rebuilt before every node call,
so state written by an earlier node **in the same event's processing chain**
is already visible to the next node.

## Node ids and names

State references always use the **node id** (`state.node_ab12.…`). Ids are
stable for the node's lifetime, so renaming a node never breaks a template.

Node **names** are display-only: the name shown on the canvas and in the
Properties panel header (editable inline — hover the header and click the
pencil). The dynamic value picker shows nodes by name but always inserts the
id, so you rarely type an id by hand.

## Declared state fields

The picker knows which fields a node exposes from its type's
`stateFields` declaration (see
[NodeTypeDefinition](#custom-nodes)) — e.g. an Action node offers one entry
per configured param under `resolvedParams`, a Condition offers its boolean
`conditionResult`. Fields the type doesn't declare can still be referenced
through the picker's *Custom path* entry.

## Templates

A string value anywhere in a node's `params` may embed placeholders — a
scope path wrapped in double curly braces:

```json
{
  "action": "reserveStock",
  "params": {
    "sku": "{{event.sku}}",
    "quantity": "{{state.action-17520001.resolvedParams.quantity}}",
    "reference": "order-{{trigger.order_id}}"
  }
}
```

Resolution rules:

```
"{{event.price}}"        →  42            (exact placeholder: type preserved)
"price: {{event.price}}" →  "price: 42"   (embedded: stringified)
"{{event.missing}}"      →  undefined     (missing path)
```

- A string that is **exactly one placeholder** keeps the resolved value's
  type — numbers stay numbers, objects and arrays pass through as-is.
- A string with **embedded** placeholders resolves to a string; if any
  placeholder is missing or non-scalar, the whole string resolves to
  `undefined` (a partially resolved template is never produced).

### Actions

When the built-in `Action` node runs, it resolves all templates in its
`params` and saves the result to its own state as `resolvedParams`. Action
executors — and any later node — read resolved values instead of raw
templates:

```
state.<nodeId>.resolvedParams.<field>
```

### Subscription match

The `match.subjectId` template of a cross-subject wait (see
[Event Subscriptions](/guide/event-subscriptions)) resolves from `trigger.`
and `state.` at park time:

```json
{ "event": "product.update", "match": { "subjectId": "product:{{state.action-17520001.resolvedParams.productId}}" } }
```

## Conditions

Condition facts opt into the scope with an explicit prefix:

```json
{
  "groups": [
    {
      "operator": "all",
      "conditions": [
        { "fact": "state.action-17520001.resolvedParams.price", "operator": "greaterThan", "value": 100 },
        { "fact": "trigger.customer_tier", "operator": "equal", "value": "gold" },
        { "fact": "event.status", "operator": "equal", "value": "paid" },
        { "fact": "status", "operator": "equal", "value": "paid" }
      ]
    }
  ]
}
```

- `state.` / `trigger.` / `event.` facts resolve against the scope.
- An **unprefixed** fact (last row) keeps its legacy meaning — the current
  event's `data` — so existing workflows behave exactly as before.

A rule's `value` may itself be a template, which enables comparing two
dynamic values with correct typing:

```json
{ "fact": "event.price", "operator": "equal", "value": "{{state.action-17520001.resolvedParams.price}}" }
```

## Custom nodes

Every `NodeModel` subclass inherits the machinery — nothing to wire up:

```typescript
class MyNode extends NodeModel {
  async acceptEvent(event: Event): Promise<boolean> {
    // The whole scope: { event, trigger, state }
    const scope = this.getScope();

    // One value, template-aware and typed
    const threshold = this.resolveValue(this.getData().params.threshold);

    // All of data.params, deep-resolved (does not mutate the definition)
    const params = this.resolveParams();

    this.setState({ result: await doSomething(params) });
    return true;
  }
}
```

Whatever a node writes with `setState()` / `updateState()` is what other
nodes see under `state.<nodeId>.…` — it is persisted in the instance's
`Context.nodeState`, so dynamic values keep working after a workflow is
suspended and resumed.

### Declaring state fields

Declare what your node writes to state in its `NodeTypeDefinition`, so the
dynamic value picker can offer those fields to users. Use the plain array
form for fixed fields, or the function form when the fields depend on the
node's configuration:

```typescript
const myNodeType: NodeTypeDefinition = {
  type: "MyNode",
  // ...
  stateFields: [
    { path: "result.status", type: "string" },
    { path: "result.score", type: "number", label: "Score" },
  ],
};

// Function form — e.g. the built-in Action exposes one field per param:
stateFields: (node) =>
  Object.keys(node.data?.params ?? {}).map((key) => ({
    path: `resolvedParams.${key}`,
  })),
```

Nodes whose type declares nothing still work at runtime — the picker just
offers a *Custom path* entry instead of a field list.

### Dynamic value inputs

In the editor, use the `DynamicValueField` (or bare `DynamicValueInput`)
primitive in a custom node's detail panel to offer the same
literal-or-template input with the two-level picker (source → declared
field):

```tsx
import { DynamicValueField } from "@omega-flow/editor";

<DynamicValueField
  label="Threshold"
  value={params.threshold ?? ""}
  onChange={(threshold) => onChange({ ...data, params: { ...params, threshold } })}
/>
```
