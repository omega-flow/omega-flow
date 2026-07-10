# Plan: Guided (step-by-step) workflow building mode

## Goal

Add a second editing style to `@omega-flow/editor` — a **guided mode** — alongside the
existing freeform drag-and-drop mode. In guided mode:

- A new workflow starts with a trigger; every unconnected output on the canvas shows a
  ghost **"Add node"** placeholder already connected by an edge.
- Clicking a placeholder opens a node chooser; picking a type inserts a real node there.
- Layout is fully automatic — the user never drags nodes or draws connections.
- Deleting a node in the middle of a flow heals the connection (predecessor is
  reconnected to successor, so the chain stays intact).
- Every edge exposes a **"+"** button to insert a node between two existing nodes.
- The mode is a library-level option so consuming devs choose which style (or both,
  toggleable) to offer.

## Current architecture (investigation summary)

- `WorkflowEditor` ([WorkflowEditor.tsx](packages/editor/src/components/WorkflowEditor.tsx))
  is a provider-only wrapper; **the consumer renders `<ReactFlow>` themselves** and wires
  it with hooks (`useNodes`, `useEdges`, `useNodeRegistry`, `useDragAndDrop`). Any guided
  mode must therefore ship as hooks + components the consumer plugs in, not as a closed
  canvas component.
- All state lives in a reducer in
  [WorkflowEditorContext.tsx](packages/editor/src/context/WorkflowEditorContext.tsx):
  `nodes`, `edges`, `selectedNodeId`, `nodeTypes` registry, dirty tracking. Actions:
  `addNode(type, position)`, `addEdge`, `removeNode` (currently drops all touching
  edges), `onNodesChange`/`onEdgesChange` (ReactFlow change application).
- `NodeTypeDefinition` ([context/types.ts](packages/editor/src/context/types.ts)) has
  label/description/Icon/defaultData/View/Detail — but **no handle metadata**. Handles
  are hardcoded inside each view (e.g. `ConditionNodeView` declares `true`/`false`
  source handles). Guided mode needs to know a node type's outputs *without rendering
  it*, to spawn one placeholder per unconnected output.
- Persisted `Workflow.flow` is plain ReactFlow nodes/edges
  ([workflow.ts](packages/types/src/workflow.ts)); the engine builds `NodeModel`s from
  node `type`, and `ConditionModel` routes via edge `sourceHandle`. **Placeholder nodes
  and edges must never leak into the saved workflow** or the engine/schema would treat
  them as real nodes.
- `getWorkflow()` serializes context state as-is; `onWorkflowChange` fires on every
  dirty change (sampleApp autosaves from it).
- Editor has no runtime deps besides `@omega-flow/types`; `@xyflow/react` is a peer dep.
- SampleApp editor page: [WorkflowEditorPage.tsx](apps/sampleApp/src/pages/WorkflowEditorPage.tsx)
  composes ReactFlow + panels manually — a good place for an old/new style switch.
- i18n via `/localization` skill (keys in `src/i18n/defaults.ts`), theming via
  `/theming` skill (`src/styles/variables.css`).

## Key design decisions

### 1. Placeholders are *derived*, never persisted

Rather than inserting fake "AddNode" nodes into `state.nodes` (which would require
stripping them in `getWorkflow()`, dirty-tracking exceptions, and schema workarounds),
compute them at render time:

- A new hook `useGuidedFlow()` takes the real `nodes`/`edges` from context and returns
  **augmented** arrays: for every source handle that has no outgoing edge, append a
  virtual placeholder node (`id: "of-placeholder:<nodeId>:<handleId>"`) plus a virtual
  dashed edge. If `nodes` is empty, return a single "Choose a trigger" placeholder.
- Real state stays clean: `getWorkflow()`, autosave, dirty tracking, engine, and schema
  are untouched. No migration concerns.
- Placeholder positions are computed from the source node position + layout constants,
  so they always sit where autolayout would put the future node.

### 2. Handle + role metadata on `NodeTypeDefinition` (additive, optional)

Extend `NodeTypeDefinition` with optional fields:

```ts
interface NodeTypeDefinition {
  // ...existing...
  /** Source handles this node exposes; default: [{ id: "output" }] */
  sourceHandles?: HandleDefinition[];
  /** Role in guided mode; default "flow" */
  role?: "trigger" | "flow" | "terminal";
}
```

- `role: "trigger"` → only offered by the empty-canvas placeholder (and excluded from
  mid-flow choosers). `role: "terminal"` (Exit) → no source handles, no placeholder after it.
- Defaults keep existing custom node types working unchanged (single `output` handle,
  `flow` role). Built-in defs in [nodes/index.ts](packages/editor/src/nodes/index.ts)
  get annotated (Condition: `true`/`false`; Exit: terminal; Trigger/StoreTrigger: trigger).
- Long term this metadata can also drive `BaseNodeView` handle rendering, removing the
  duplication — out of scope here, but the shape is chosen to allow it.

### 3. Mode is context-level config

`WorkflowEditorProps` gains `mode?: "freeform" | "guided"` (default `"freeform"`), stored
in context state. Reducer behavior that differs by mode (edge healing on delete) checks
it; hooks/components read it. A `setMode` action is exposed so apps can toggle live
(sampleApp switch).

### 4. Autolayout

- New util `layoutFlow(nodes, edges, nodeTypes, options): Node[]` — pure function
  returning nodes with recomputed positions. Top-to-bottom layered layout.
- **Recommendation: implement a small internal layered-tree layout** (~100 lines: BFS
  ranking from roots, per-rank horizontal distribution, honoring measured node sizes
  when available) instead of adding `@dagrejs/dagre`. Workflows here are shallow trees
  (trigger → chain with occasional condition branches); dagre is overkill and adds a
  runtime dep to a currently dependency-free library. If layouts outgrow it, dagre can
  be swapped in behind the same util signature later.
- Exposed as context action `autoLayout()` (usable from freeform mode too). In guided
  mode it runs automatically after every structural mutation (insert/remove), inside the
  reducer so there's a single state transition (no flicker).

### 5. New structural actions (mode-independent, pure reducer logic)

- `insertNodeAfter(sourceNodeId, sourceHandleId, type)` — create node + edge from that
  handle; in guided mode followed by autolayout. Backs the placeholder click.
- `insertNodeOnEdge(edgeId, type)` — replace edge A→C with A→B and B→C (B's default
  source handle feeds C). Backs the edge "+" button. Requirement: *add node between two
  existing nodes*. If the inserted type is branching (Condition), the first source
  handle (`true`) inherits the downstream connection and the other handle gets a
  placeholder.
- `removeNode` gains healing behavior in guided mode: for deleted node B, reconnect each
  incoming edge (A→B) to B's outgoing target, preserving A's `sourceHandle`. Policy:
  - exactly one outgoing edge → heal (A keeps its connection to the rest of the flow —
    the "connection stays available without the node" requirement);
  - zero outgoing → incoming source handle simply becomes unconnected (placeholder
    reappears);
  - multiple outgoing (deleting a Condition) → heal the incoming edge to the **first**
    outgoing target; the other branch's subtree becomes detached and is **also removed**
    (guided mode never shows orphan subtrees). This is the one lossy case — flagged in
    the chooser/detail panel? No: keep v1 simple, document it. (Open question below.)
- Freeform mode `removeNode` keeps today's behavior — no surprises for existing users.

### 6. New UI components (exported, composable)

- **`AddNodePlaceholderView`** — canvas node view for placeholders (dashed border, "+"
  icon, "Add node" / "Choose a trigger" label). Registered automatically into
  `reactFlowNodeTypes` by `useNodeRegistry` under a reserved type key.
- **`NodeChooser`** — popover listing eligible node types (reuses NodesPanel item
  styling + `filter` prop concept). Opens on placeholder click or edge "+" click.
  Controlled by context UI state `pendingInsertion: { kind: "after", nodeId, handleId } |
  { kind: "edge", edgeId } | null`.
- **`InsertableEdge`** — custom ReactFlow edge type rendering a small "+" button at the
  edge midpoint (guided mode only; hidden on virtual placeholder edges).
- **`useGuidedFlow()`** — the one-stop hook returning everything the consumer spreads
  onto `<ReactFlow>`:

```tsx
function GuidedCanvas() {
  const { nodes, edges, nodeTypes, edgeTypes, reactFlowProps } = useGuidedFlow();
  return (
    <ReactFlow nodes={nodes} edges={edges} nodeTypes={nodeTypes}
               edgeTypes={edgeTypes} {...reactFlowProps}>
      <NodeChooser />
      {/* panels as usual; NodesPanel omitted in guided mode */}
    </ReactFlow>
  );
}
```

  `reactFlowProps` includes `onNodesChange`/`onEdgesChange` (filtered so placeholder
  nodes can't be moved/removed and structural edits stay consistent),
  `nodesConnectable: false`, `nodesDraggable: false` (see open questions),
  `deleteKeyCode` handling that routes through healing `removeNode`.

### 7. Configurability for library consumers

- `mode` prop (+ `setMode`) — the master switch.
- `NodeChooser` accepts `filter`/`renderItem` like `NodesPanel`.
- Layout options (`direction`, `spacing`) via `WorkflowEditorProps.layoutOptions`.
- Everything is exported piecemeal, so a consumer can use only the placeholder system,
  or only `autoLayout()`, in an otherwise freeform editor.

## Implementation phases

### Phase 1 — Core state & structural actions (editor package)
1. Add `mode` to state/props/context; `setMode` action.
2. Extend `NodeTypeDefinition` with `sourceHandles`/`role`; annotate `defaultNodeTypes`.
3. Implement `insertNodeAfter`, `insertNodeOnEdge`, healing `removeNode` as pure
   functions in `src/utils/graph.ts` + reducer wiring.
4. Jest tests for the graph utils (insertion, healing incl. condition-branch policy,
   sourceHandle preservation). Test file pattern per repo convention.

### Phase 2 — Autolayout
1. `src/utils/layout.ts`: layered tree layout, pure + unit-tested.
2. `autoLayout()` action; auto-invoke on structural changes when `mode === "guided"`.

### Phase 3 — Guided UI
1. `AddNodePlaceholderView` + derived placeholder computation (`useGuidedFlow`).
2. `pendingInsertion` UI state + `NodeChooser` popover.
3. `InsertableEdge` with "+" button.
4. `useNodeRegistry` auto-registers the placeholder node type and insertable edge type.
5. i18n keys (`guided.addNode`, `guided.chooseTrigger`, `guided.chooserTitle`, …) via
   `/localization`; CSS variables (placeholder colors, dashed edge style, "+" button)
   via `/theming`.

### Phase 4 — Public API & exports
1. Export new hooks/components/types from `src/index.ts`.
2. Ensure `getWorkflow()` provably never contains placeholder artifacts (assertion in
   tests since placeholders are derived — should be free).

### Phase 5 — SampleApp demo
1. Add an editor-style switch (segmented control "Classic / Guided") in the
   `EditorCanvas` header of [WorkflowEditorPage.tsx](apps/sampleApp/src/pages/WorkflowEditorPage.tsx),
   wired to `setMode`; render `NodesPanel` + drag-drop wiring only in classic mode,
   `useGuidedFlow` + `NodeChooser` in guided mode. Persist choice in `localStorage`.
2. Annotate the sampleApp's custom `storeTrigger` node type with `role: "trigger"`.

### Phase 6 — Docs
1. New guide page in `packages/doc`: "Guided building mode" — mode prop, `useGuidedFlow`
   usage, extending custom node types with `sourceHandles`/`role`, layout options.
2. Update editor README/API reference for the new exports.

## Open questions (need product decisions)

1. **Deleting a branching node (Condition) in guided mode** — proposed: keep first
   branch, delete the other branch's subtree. Alternative: block deletion until one
   branch is empty, or ask via confirmation. Which?
2. **Node dragging in guided mode** — proposed: disabled (autolayout owns positions).
   Alternative: allow dragging but snap back / re-layout on drop.
3. **Empty canvas in guided mode** — proposed: show a "Choose a trigger" placeholder
   rather than auto-creating a Trigger node (keeps user in control, and custom apps may
   have several trigger types, e.g. sampleApp's StoreTrigger).
4. **Layout dependency** — proposed: internal ~100-line tree layout, no new dep. OK, or
   prefer `@dagrejs/dagre` from the start?

## Risks / notes

- ReactFlow `onNodesChange` will emit changes for virtual placeholder nodes (selection,
  dimensions); `useGuidedFlow` must filter these before they reach the reducer, else
  placeholders end up in real state. This is the main correctness hot spot — cover with
  tests.
- Autolayout before nodes are measured: first layout pass uses default node dimensions;
  re-run once ReactFlow reports measured sizes (`dimensions` changes) to avoid overlap.
- Backward compatibility: all `NodeTypeDefinition` additions optional; default mode is
  `freeform`; no persisted-format changes → no engine/types/schema changes at all.
