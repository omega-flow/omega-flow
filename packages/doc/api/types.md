# Type Reference

This page documents all TypeScript types exported by `@omega-flow/editor` and `@omega-flow/types`.

## Core Types (@omega-flow/types)

### Workflow

```typescript
interface Workflow {
  id: string;
  name: string;
  flow: {
    nodes: Node[];
    edges: Edge[];
  };
  options: WorkflowOptions;
}
```

The main workflow definition containing the flow graph and metadata.

| Property | Type | Description |
|----------|------|-------------|
| `id` | `string` | Unique workflow identifier |
| `name` | `string` | Human-readable workflow name |
| `flow` | `{ nodes, edges }` | The workflow graph |
| `options` | `WorkflowOptions` | Configuration options |

---

### WorkflowOptions

```typescript
interface WorkflowOptions {
  frequency?: WorkflowFrequency;
  [key: string]: any;
}
```

Workflow configuration options.

| Property | Type | Description |
|----------|------|-------------|
| `frequency` | `WorkflowFrequency` | Execution frequency settings |

---

### WorkflowFrequency

```typescript
interface WorkflowFrequency {
  type: "one_time" | "every_rematch";
  interval?: number;
}
```

Controls how often a subject can enter/re-enter a workflow.

| Property | Type | Description |
|----------|------|-------------|
| `type` | `"one_time" \| "every_rematch"` | Frequency type |
| `interval` | `number` | Interval in seconds (for `every_rematch`) |

**Frequency Types:**
- `one_time` - Subject enters only the first time they meet trigger conditions
- `every_rematch` - Subject can re-enter at specified intervals

---

### WorkflowStatus

```typescript
enum WorkflowStatus {
  Idle = "idle",
  Waiting = "waiting",
  Processing = "processing",
  Transforming = "transforming",
  Completed = "completed",
}
```

Workflow execution states.

| Status | Description |
|--------|-------------|
| `idle` | Initial state, workflow not started |
| `waiting` | Running, waiting for events |
| `processing` | Currently processing an event |
| `transforming` | Moving between nodes |
| `completed` | Workflow finished |

---

### Node

```typescript
// Re-exported from @xyflow/react
interface Node {
  id: string;
  type?: string;
  position: { x: number; y: number };
  data: Record<string, unknown>;
  // ...other ReactFlow node properties
}
```

A node in the workflow graph. Uses ReactFlow's Node type.

---

### Edge

```typescript
// Re-exported from @xyflow/react
interface Edge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
  // ...other ReactFlow edge properties
}
```

A connection between nodes. Uses ReactFlow's Edge type.

---

### Event

```typescript
interface Event {
  id: string;
  time: number;
  type: string;
  domain?: string;
  subjectId?: string;
  delivery?: EventDelivery;
  data?: any;
}
```

An event that can trigger or progress a workflow. Everything the engine uses
for addressing lives on the envelope (`domain`, `subjectId`, `delivery`) —
`data` belongs to the host.

| Property | Type | Description |
|----------|------|-------------|
| `id` | `string` | Unique event identifier |
| `time` | `number` | Timestamp (Unix ms) |
| `type` | `string` | Event type for matching |
| `domain` | `string` *(optional)* | Explicit envelope routing: the domain (tenant). When both `domain` and `subjectId` are set, they always win over the configured `eventExtractor` |
| `subjectId` | `string` *(optional)* | Explicit envelope routing: the subject the event is addressed to (e.g. `client:5`). Set by the engine on subscription delivery copies |
| `delivery` | `EventDelivery` *(optional)* | Present only on subscription delivery copies (engine-authored): the one instance this copy must resume |
| `data` | `any` | Optional payload data |

---

### EventDelivery

```typescript
interface EventDelivery {
  workflowId: string;
  instanceId: string;
  nodeId: string;
  sourceSubjectId: string;
}
```

Delivery metadata carried in `event.delivery` on events relayed to a subscriber via an [event subscription](/guide/event-subscriptions). A delivery event is a copy of the original event, retargeted at one specific workflow instance — `WorkflowManager.processEvent` recognizes it and performs a targeted resume of exactly that instance instead of normal routing.

| Property | Type | Description |
|----------|------|-------------|
| `workflowId` | `string` | Workflow the subscribing instance belongs to |
| `instanceId` | `string` | Instance that registered the subscription |
| `nodeId` | `string` | The parked node that declared the subscription |
| `sourceSubjectId` | `string` | Subject id the original event was routed to (e.g. `product:456`) |

---

### Context

```typescript
interface Context {
  workflowId: string;
  instanceId: string;
  currentNodeId: string | null;
  nodeState: NodeState;
  history: WorkflowHistoryItem[];
  isCompleted?: boolean;
  startedAt: number;
  version?: number;
  triggerEvent?: Event;
  subscriptions?: ContextSubscription[];
}
```

Execution state for a workflow instance.

| Property | Type | Description |
|----------|------|-------------|
| `workflowId` | `string` | Which workflow this instance runs |
| `instanceId` | `string` | Unique instance identifier |
| `currentNodeId` | `string \| null` | Node currently waiting for events |
| `nodeState` | `NodeState` | State data for nodes |
| `history` | `WorkflowHistoryItem[]` | Execution history |
| `isCompleted` | `boolean` | Whether workflow finished |
| `startedAt` | `number` | Start timestamp (Unix ms) |
| `version` | `number` | Optimistic-lock version, managed by persistent memory backends |
| `triggerEvent` | `Event` | The event that started this instance — captured when the start node fires, used e.g. to resolve subscription match templates |
| `subscriptions` | `ContextSubscription[]` | Active [event subscriptions](/guide/event-subscriptions) held by this instance; managed by the `WorkflowManager` |

---

### ContextSubscription

```typescript
interface ContextSubscription {
  eventType: string;
  matchSubjectId: string;
  nodeId: string;
}
```

An active event subscription recorded on the Context. The Context is the source of truth for which subscriptions an instance holds in the `SubscriptionStore` — when the instance advances past the node that declared one, the `WorkflowManager` deletes exactly these entries.

| Property | Type | Description |
|----------|------|-------------|
| `eventType` | `string` | Event type the instance is waiting for |
| `matchSubjectId` | `string` | Subject id of the source event, or `"*"` for wildcard |
| `nodeId` | `string` | Parked node that declared the subscription |

---

### NodeState

```typescript
interface NodeState {
  [key: string]: any;
}
```

Flexible key-value storage for node state.

---

### WorkflowHistoryItem

```typescript
interface WorkflowHistoryItem {
  time: number;
  type: "started" | "step" | "completed";
  fromNodeId?: string | null;
  toNodeId?: string | null;
}
```

A record of workflow execution events.

| Property | Type | Description |
|----------|------|-------------|
| `time` | `number` | When this occurred |
| `type` | `string` | Type of history event |
| `fromNodeId` | `string \| null` | Source node |
| `toNodeId` | `string \| null` | Destination node |

---

## Editor Types (@omega-flow/editor)

### NodeTypeDefinition

```typescript
interface NodeTypeDefinition {
  type: string;
  label: string;
  description?: string;
  Icon?: ComponentType<{ size?: number }>;
  defaultData: Record<string, unknown>;
  sourceHandles: HandleDefinition[];
  targetHandles: HandleDefinition[];
  ViewComponent: ComponentType<NodeViewProps>;
  DetailComponent: ComponentType<NodeDetailProps>;
}
```

Complete definition of a node type.

| Property | Type | Description |
|----------|------|-------------|
| `type` | `string` | Unique type identifier |
| `label` | `string` | Display name |
| `description` | `string` | Tooltip/description text |
| `Icon` | `ComponentType` | Icon component |
| `defaultData` | `Record` | Initial data for new nodes |
| `sourceHandles` | `HandleDefinition[]` | Output handles |
| `targetHandles` | `HandleDefinition[]` | Input handles |
| `ViewComponent` | `ComponentType` | Canvas render component |
| `DetailComponent` | `ComponentType` | Properties panel component |

---

### HandleDefinition

```typescript
interface HandleDefinition {
  id: string;
  label?: string;
}
```

Definition for a connection handle on a node.

| Property | Type | Description |
|----------|------|-------------|
| `id` | `string` | Handle identifier |
| `label` | `string` | Display label |

---

### NodeViewProps

```typescript
type NodeViewProps = NodeProps; // From @xyflow/react
```

Props passed to node view components (on canvas). Extends ReactFlow's NodeProps.

Key properties:
- `id: string` - Node ID
- `data: Record<string, unknown>` - Node data
- `selected: boolean` - Selection state
- `dragging: boolean` - Drag state

---

### NodeDetailProps

```typescript
interface NodeDetailProps {
  node: Node;
  onChange: (data: Record<string, unknown>) => void;
}
```

Props passed to node detail components (properties panel).

| Property | Type | Description |
|----------|------|-------------|
| `node` | `Node` | The node being edited |
| `onChange` | `(data) => void` | Update node data callback |

---

### WorkflowEditorState

```typescript
interface WorkflowEditorState {
  workflow: Workflow | null;
  nodes: Node[];
  edges: Edge[];
  options: WorkflowOptions;
  name: string;
  selectedNodeId: string | null;
  isDirty: boolean;
  nodeTypes: Map<string, NodeTypeDefinition>;
}
```

Editor state managed by context.

---

### WorkflowEditorActions

```typescript
interface WorkflowEditorActions {
  loadWorkflow: (workflow: Workflow) => void;
  resetWorkflow: () => void;
  addNode: (type: string, position: { x: number; y: number }) => void;
  updateNode: (nodeId: string, data: Record<string, unknown>) => void;
  updateNodePosition: (nodeId: string, position: { x: number; y: number }) => void;
  removeNode: (nodeId: string) => void;
  selectNode: (nodeId: string | null) => void;
  addEdge: (connection: Connection) => void;
  removeEdge: (edgeId: string) => void;
  setName: (name: string) => void;
  setOptions: (options: WorkflowOptions) => void;
  registerNodeType: (definition: NodeTypeDefinition) => void;
  getWorkflow: () => Workflow;
  markClean: () => void;
  onNodesChange: (changes: unknown[]) => void;
  onEdgesChange: (changes: unknown[]) => void;
  onConnect: (connection: unknown) => void;
}
```

Actions available in the editor context.

---

### WorkflowEditorContextValue

```typescript
interface WorkflowEditorContextValue
  extends WorkflowEditorState,
    WorkflowEditorActions {}
```

Complete context value combining state and actions.

---

### Component Props

#### WorkflowEditorProps

```typescript
interface WorkflowEditorProps {
  children: ReactNode;
  workflow?: Workflow;
  nodeTypes?: NodeTypeDefinition[];
  onWorkflowChange?: (workflow: Workflow) => void;
  onDirtyChange?: (isDirty: boolean) => void;
  translationFn?: TranslationFunction;
  translations?: TranslationDictionary;
}
```

| Property | Type | Description |
|----------|------|-------------|
| `translationFn` | `TranslationFunction` | Custom translation function (replaces built-in resolver) |
| `translations` | `TranslationDictionary` | Dictionary merged on top of defaults (ignored when `translationFn` is set) |

See [Localization](/guide/localization) for usage details.

#### NodesPanelProps

```typescript
interface NodesPanelProps {
  className?: string;
  showDescriptions?: boolean;
  filter?: (nodeType: NodeTypeDefinition) => boolean;
  renderItem?: (nodeType: NodeTypeDefinition) => ReactNode;
}
```

#### DetailPanelProps

```typescript
interface DetailPanelProps {
  className?: string;
  emptyMessage?: ReactNode;
  showNodeType?: boolean;
  showNodeId?: boolean;
}
```

#### OptionsPanelProps

```typescript
interface OptionsPanelProps {
  className?: string;
  showFrequency?: boolean;
  customOptions?: ReactNode;
}
```

#### ControlPanelProps

```typescript
interface ControlPanelProps {
  className?: string;
  showName?: boolean;
  showSaveButton?: boolean;
  saveButtonLabel?: string;
  onSave?: () => Promise<void>;
  renderActions?: (context: { isDirty: boolean; workflow: Workflow }) => ReactNode;
}
```

#### BaseNodeViewProps

```typescript
interface BaseNodeViewProps {
  id: string;
  data: Record<string, unknown>;
  selected?: boolean;
  label: string;
  color?: string;
  icon?: React.ReactNode;
  sourceHandles?: HandleDefinition[];
  targetHandles?: HandleDefinition[];
  children?: React.ReactNode;
}
```

---

## Primitive Props

See [Primitives API](/api/primitives) for form field prop types:

- `FieldProps`
- `TextFieldProps`
- `NumberFieldProps`
- `SelectFieldProps`
- `SelectOption`
- `CheckboxFieldProps`
- `TextAreaFieldProps`
- `DurationFieldProps`
- `JsonFieldProps`
- `FieldGroupProps`

---

## JSON Schemas

The `@omega-flow/types` package exports JSON schemas for validation:

```typescript
import {
  WorkflowSchema,
  EventSchema,
  ContextSchema,
} from "@omega-flow/types";
```

Use with Ajv for runtime validation:

```typescript
import Ajv from "ajv";
import { WorkflowSchema } from "@omega-flow/types";

const ajv = new Ajv();
const validate = ajv.compile(WorkflowSchema);

if (!validate(workflow)) {
  console.error("Invalid workflow:", validate.errors);
}
```

---

## Localization Types

### TranslationFunction

```typescript
type TranslationFunction = (
  key: string,
  params?: Record<string, string>
) => string;
```

The core function signature for translating strings. Accepts a dot-separated key and optional interpolation parameters (`{{param}}`).

---

### TranslationDictionary

```typescript
type TranslationDictionary = Record<string, string>;
```

A flat mapping of keys to translation strings. Supports `{{param}}` interpolation placeholders.

---

### TranslationProviderProps

```typescript
interface TranslationProviderProps {
  children: ReactNode;
  translationFn?: TranslationFunction;
  translations?: TranslationDictionary;
}
```

Props for the `TranslationProvider` component (used internally by `WorkflowEditor`).

---

## Utility Functions

### nodeHasType

```typescript
function nodeHasType(node: Node): node is Node & { type: string };
```

Type guard to check if a node has a type property.

```typescript
import { nodeHasType } from "@omega-flow/types";

if (nodeHasType(node)) {
  console.log(node.type); // TypeScript knows type exists
}
```
