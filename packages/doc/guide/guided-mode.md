# Guided Building Mode

The editor supports two editing styles:

- **Freeform** (default) — the classic drag-and-drop canvas: users drag node
  types from the `NodesPanel`, place them anywhere, and draw connections by
  hand.
- **Guided** — step-by-step building: every unconnected output shows a dashed
  **"Add node"** placeholder already wired to its source, clicking it opens a
  node chooser, and the layout is computed automatically. Users never drag
  nodes or draw edges.

Guided mode is a good fit for non-technical users: the flow always stays a
tidy, connected tree, and every possible action is a visible click target.

## Enabling guided mode

Pass `mode="guided"` to `WorkflowEditor` and render the canvas with the
`useGuidedFlow` hook and the `NodeChooser` component:

```tsx
import { ReactFlow, Background, Controls } from "@xyflow/react";
import {
  WorkflowEditor,
  NodeChooser,
  useGuidedFlow,
} from "@omega-flow/editor";

function GuidedCanvas() {
  const { nodes, edges, nodeTypes, edgeTypes, reactFlowProps } =
    useGuidedFlow();

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      edgeTypes={edgeTypes}
      {...reactFlowProps}
      fitView
    >
      <Background />
      <Controls />
      <NodeChooser />
    </ReactFlow>
  );
}

export function App({ workflow }) {
  return (
    <WorkflowEditor workflow={workflow} mode="guided">
      <GuidedCanvas />
    </WorkflowEditor>
  );
}
```

`useGuidedFlow` returns:

| Field | Description |
| --- | --- |
| `nodes` / `edges` | The flow augmented with the derived placeholders, laid out automatically |
| `nodeTypes` | ReactFlow `nodeTypes` map including the placeholder view |
| `edgeTypes` | ReactFlow `edgeTypes` map with the insertable ("+" button) edge |
| `reactFlowProps` | Props to spread onto `<ReactFlow>` (change handlers, `nodesDraggable: false`, …) |
| `mode` / `isGuided` | The current editor mode |

In freeform mode the hook degrades to a plain pass-through (no placeholders,
standard handlers, `onConnect` included), so a single canvas component can
serve both modes — render the `NodesPanel` and drag-and-drop wiring only when
`isGuided` is false. See `apps/sampleApp/src/pages/WorkflowEditorPage.tsx`
for a complete toggleable example.

## Switching modes at runtime

Use the `setMode` action to let users toggle between styles:

```tsx
const { mode, setMode } = useWorkflowEditor();

<button onClick={() => setMode(mode === "guided" ? "freeform" : "guided")}>
  Switch style
</button>;
```

Entering guided mode re-lays out the flow automatically. Placeholders are
**derived, never persisted**: the workflow returned by `getWorkflow()` (and
anything you save) only ever contains real nodes and edges, so workflows are
fully interchangeable between the two modes.

## How guided editing behaves

- **Empty canvas** — a single "Choose a trigger" placeholder is shown; only
  node types with `role: "trigger"` are offered.
- **Adding a node** — clicking an "Add node" placeholder opens the chooser
  for that output; the node is inserted, connected, selected, and the flow is
  re-laid out.
- **Inserting between nodes** — every real edge renders a small **"+"**
  button at its midpoint; clicking it inserts the chosen node in the middle
  (`A→C` becomes `A→B→C`). Terminal node types are not offered here since
  they have no outputs.
- **Deleting a node** — the flow *heals*: the predecessor is reconnected to
  the removed node's first following node, preserving the source handle
  (`A→B→C` becomes `A→C`). Deleting a branching node (e.g. a Condition) keeps
  its first branch and removes the other branch's now-unreachable subtree.
- **No dragging, no manual connections** — positions and edges are managed by
  the editor; `reactFlowProps` disables `nodesConnectable` and
  `nodesDraggable`.

## Node type metadata

Guided mode needs to know each node type's outputs and role without rendering
it. Custom node types should declare them in their `NodeTypeDefinition`:

```ts
const storeTriggerNodeType: NodeTypeDefinition = {
  type: "StoreTrigger",
  label: "Store Trigger",
  // ...
  sourceHandles: [{ id: "output" }],
  role: "trigger",
};
```

- `sourceHandles` — the outputs the node's view renders. Defaults to a single
  `{ id: "output" }` handle. A Condition-style node would declare
  `[{ id: "true" }, { id: "false" }]`; the handle order also controls the
  left-to-right branch order in the automatic layout.
- `role` — `"trigger"` (offered only on an empty canvas), `"flow"` (default),
  or `"terminal"` (no outputs, no placeholder after it, not insertable into
  the middle of an edge).

Both fields are optional, so existing custom node types keep working
unchanged in freeform mode.

## Automatic layout

The layout is a top-to-bottom layered tree: the trigger at the top, each
node's children below it, siblings side by side, and parents centered over
their subtrees. Tune it via `layoutOptions`:

```tsx
<WorkflowEditor
  mode="guided"
  layoutOptions={{ direction: "LR", rankGap: 80, nodeGap: 32 }}
>
```

| Option | Default | Description |
| --- | --- | --- |
| `direction` | `"TB"` | `"TB"` (top-to-bottom) or `"LR"` (left-to-right) |
| `rankGap` | `60` | Gap between ranks, in px |
| `nodeGap` | `40` | Gap between siblings, in px |
| `nodeWidth` | `180` | Fallback node width before measurement |
| `nodeHeight` | `70` | Fallback node height before measurement |

The same layout is available as a one-off action in freeform mode via
`useWorkflowEditor().autoLayout()`, and as a pure function via the exported
`layoutFlow(nodes, edges, nodeTypes?, options?)`.

## Customizing the chooser

`NodeChooser` accepts the same `filter` / `renderItem` props as `NodesPanel`:

```tsx
<NodeChooser filter={(def) => def.type !== "Wait"} />
```

## Theming

Guided-mode visuals use CSS variables (see [Theming](./theming.md)):
`--of-guided-placeholder-bg`, `--of-guided-placeholder-border`,
`--of-guided-placeholder-color`, `--of-guided-edge-color`,
`--of-guided-add-button-bg`, and their `-hover` variants. All default to the
base palette, so dark mode works out of the box.
