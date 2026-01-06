# Components

The `@omega-flow/editor` package provides several React components for building workflow editors.

## WorkflowEditor

The main wrapper component that provides context and state management.

### Import

```tsx
import { WorkflowEditor } from "@omega-flow/editor";
```

### Props

```typescript
interface WorkflowEditorProps {
  children: ReactNode;
  workflow?: Workflow;
  nodeTypes?: NodeTypeDefinition[];
  onWorkflowChange?: (workflow: Workflow) => void;
  onDirtyChange?: (isDirty: boolean) => void;
}
```

| Prop | Type | Description |
|------|------|-------------|
| `children` | `ReactNode` | Child components (your editor UI) |
| `workflow` | `Workflow` | Initial workflow to load |
| `nodeTypes` | `NodeTypeDefinition[]` | Node types to register (defaults to built-in types) |
| `onWorkflowChange` | `(workflow: Workflow) => void` | Called when workflow changes |
| `onDirtyChange` | `(isDirty: boolean) => void` | Called when dirty state changes |

### Usage

```tsx
import { WorkflowEditor, defaultNodeTypes } from "@omega-flow/editor";

function App() {
  const handleWorkflowChange = (workflow: Workflow) => {
    console.log("Workflow updated:", workflow);
  };

  return (
    <WorkflowEditor
      workflow={existingWorkflow}
      nodeTypes={defaultNodeTypes}
      onWorkflowChange={handleWorkflowChange}
    >
      <YourEditorCanvas />
    </WorkflowEditor>
  );
}
```

### Notes

- If no `nodeTypes` provided, it falls back to `defaultNodeTypes`
- The component wraps children with `ReactFlowProvider` and `WorkflowEditorProvider`
- All editor hooks must be used within this provider

---

## NodesPanel

A draggable palette of available node types.

### Import

```tsx
import { NodesPanel } from "@omega-flow/editor";
```

### Props

```typescript
interface NodesPanelProps {
  className?: string;
  showDescriptions?: boolean;
  filter?: (nodeType: NodeTypeDefinition) => boolean;
  renderItem?: (nodeType: NodeTypeDefinition) => ReactNode;
}
```

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `className` | `string` | - | CSS class name |
| `showDescriptions` | `boolean` | `true` | Show node descriptions |
| `filter` | `(nodeType) => boolean` | - | Filter which nodes to show |
| `renderItem` | `(nodeType) => ReactNode` | - | Custom node item renderer |

### Usage

```tsx
import { NodesPanel } from "@omega-flow/editor";
import { Panel } from "@xyflow/react";

function EditorCanvas() {
  return (
    <ReactFlow {...props}>
      <Panel position="top-left">
        <NodesPanel showDescriptions={true} />
      </Panel>
    </ReactFlow>
  );
}
```

### Filtering Nodes

```tsx
// Only show certain node types
<NodesPanel
  filter={(nodeType) =>
    ["Trigger", "Action", "Exit"].includes(nodeType.type)
  }
/>
```

### Custom Rendering

```tsx
<NodesPanel
  renderItem={(nodeType) => (
    <div className="my-custom-node-item">
      {nodeType.Icon && <nodeType.Icon size={20} />}
      <span>{nodeType.label}</span>
    </div>
  )}
/>
```

---

## DetailPanel

Property editor panel for the selected node.

### Import

```tsx
import { DetailPanel } from "@omega-flow/editor";
```

### Props

```typescript
interface DetailPanelProps {
  className?: string;
  emptyMessage?: ReactNode;
  showNodeType?: boolean;
  showNodeId?: boolean;
}
```

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `className` | `string` | - | CSS class name |
| `emptyMessage` | `ReactNode` | "Select a node to edit its properties" | Message when no node selected |
| `showNodeType` | `boolean` | `true` | Show node type label in header |
| `showNodeId` | `boolean` | `false` | Show node ID in header |

### Usage

```tsx
import { DetailPanel } from "@omega-flow/editor";
import { Panel } from "@xyflow/react";

function EditorCanvas() {
  return (
    <ReactFlow {...props}>
      <Panel position="bottom-right">
        <DetailPanel
          showNodeType={true}
          showNodeId={false}
          emptyMessage="Click a node to configure it"
        />
      </Panel>
    </ReactFlow>
  );
}
```

### How It Works

- Displays the `DetailComponent` from the selected node's `NodeTypeDefinition`
- Automatically calls `onChange` when user modifies node properties
- Shows a delete button to remove the selected node

---

## OptionsPanel

Panel for editing workflow-level options.

### Import

```tsx
import { OptionsPanel } from "@omega-flow/editor";
```

### Props

```typescript
interface OptionsPanelProps {
  className?: string;
  showFrequency?: boolean;
  customOptions?: ReactNode;
}
```

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `className` | `string` | - | CSS class name |
| `showFrequency` | `boolean` | `true` | Show frequency options |
| `customOptions` | `ReactNode` | - | Additional custom options to render |

### Usage

```tsx
import { OptionsPanel } from "@omega-flow/editor";
import { Panel } from "@xyflow/react";

function EditorCanvas() {
  return (
    <ReactFlow {...props}>
      <Panel position="bottom-left">
        <OptionsPanel showFrequency={true} />
      </Panel>
    </ReactFlow>
  );
}
```

### Adding Custom Options

```tsx
<OptionsPanel
  customOptions={
    <div>
      <TextField
        label="Custom Field"
        value={customValue}
        onChange={setCustomValue}
      />
    </div>
  }
/>
```

### Frequency Options

The panel shows frequency configuration:
- **One Time** - Workflow runs once per subject
- **Every Rematch** - Workflow can re-run at intervals

---

## ControlPanel

Top panel for workflow name and save controls.

### Import

```tsx
import { ControlPanel } from "@omega-flow/editor";
```

### Props

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

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `className` | `string` | - | CSS class name |
| `showName` | `boolean` | `true` | Show name input field |
| `showSaveButton` | `boolean` | `true` | Show save button |
| `saveButtonLabel` | `string` | "Save" | Custom save button label |
| `onSave` | `() => Promise<void>` | - | Save callback handler |
| `renderActions` | `(context) => ReactNode` | - | Custom actions renderer |

### Usage

```tsx
import { ControlPanel } from "@omega-flow/editor";
import { Panel } from "@xyflow/react";

function EditorCanvas() {
  const handleSave = async () => {
    const workflow = getWorkflow();
    await saveWorkflowToServer(workflow);
  };

  return (
    <ReactFlow {...props}>
      <Panel position="top-right">
        <ControlPanel
          onSave={handleSave}
          saveButtonLabel="Save Workflow"
        />
      </Panel>
    </ReactFlow>
  );
}
```

### Custom Actions

```tsx
<ControlPanel
  onSave={handleSave}
  renderActions={({ isDirty, workflow }) => (
    <>
      <button onClick={() => exportWorkflow(workflow)}>
        Export
      </button>
      <button disabled={!isDirty} onClick={handleReset}>
        Reset
      </button>
    </>
  )}
/>
```

### Save Status

The panel shows save status feedback:
- Displays "Saving..." during save
- Shows "Saved" on success
- Shows "Error saving" on failure

---

## BaseNodeView

Base component for building custom node views.

### Import

```tsx
import { BaseNodeView } from "@omega-flow/editor";
```

### Props

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

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `id` | `string` | - | Node ID |
| `data` | `Record<string, unknown>` | - | Node data |
| `selected` | `boolean` | - | Whether node is selected |
| `label` | `string` | - | Node label |
| `color` | `string` | `"#666"` | Node border color |
| `icon` | `ReactNode` | - | Icon to display |
| `sourceHandles` | `HandleDefinition[]` | `[]` | Output handles |
| `targetHandles` | `HandleDefinition[]` | `[]` | Input handles |
| `children` | `ReactNode` | - | Content to display |

### Usage

```tsx
import { BaseNodeView, type NodeViewProps } from "@omega-flow/editor";

function MyCustomNodeView({ id, data, selected }: NodeViewProps) {
  return (
    <BaseNodeView
      id={id}
      data={data as Record<string, unknown>}
      selected={selected}
      label="My Node"
      color="#FF5722"
      icon={<MyIcon />}
      sourceHandles={[{ id: "output", label: "Next" }]}
      targetHandles={[{ id: "input", label: "In" }]}
    >
      <span>{data.someValue}</span>
    </BaseNodeView>
  );
}
```

---

## Built-in Node Views

The package exports all built-in node view components:

```tsx
import {
  TriggerNodeView,
  ActionNodeView,
  ConditionNodeView,
  WaitNodeView,
  TriggerOrTimeoutNodeView,
  ExitNodeView,
} from "@omega-flow/editor";
```

## Built-in Node Details

The package exports all built-in node detail components:

```tsx
import {
  TriggerNodeDetail,
  ActionNodeDetail,
  ConditionNodeDetail,
  WaitNodeDetail,
  TriggerOrTimeoutNodeDetail,
  ExitNodeDetail,
} from "@omega-flow/editor";
```

## Default Node Types

Access the default node type definitions:

```tsx
import { defaultNodeTypes } from "@omega-flow/editor";

// Array of 6 NodeTypeDefinition objects:
// - Trigger
// - Action
// - Condition
// - Wait
// - TriggerOrTimeout
// - Exit
```
