# Editor Setup

This guide walks you through setting up the Omega Flow workflow editor in your React application.

## Prerequisites

- React 18 or later
- A package manager (pnpm, npm, or yarn)

## Installation

Install the required packages:

```bash
pnpm add @omega-flow/editor @omega-flow/types @xyflow/react
```

The editor package has the following peer dependencies:
- `react` >= 18
- `react-dom` >= 18
- `@xyflow/react` >= 12

## Basic Setup

### 1. Import Styles

First, import the ReactFlow styles in your application:

```tsx
import "@xyflow/react/dist/style.css";
```

### 2. Create the Editor Component

The workflow editor consists of several key parts:

1. **WorkflowEditor** - The main wrapper that provides context
2. **ReactFlow** - The canvas for rendering the workflow graph
3. **Panel components** - UI panels for node palette, properties, etc.
4. **Hooks** - For interacting with the editor state

Here's a minimal setup:

```tsx
import React from "react";
import { ReactFlow, Background, Controls, Panel } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  WorkflowEditor,
  NodesPanel,
  DetailPanel,
  OptionsPanel,
  ControlPanel,
  useNodes,
  useEdges,
  useNodeRegistry,
  useDragAndDrop,
  useWorkflowEditor,
  defaultNodeTypes,
} from "@omega-flow/editor";

// Inner component that uses the editor hooks
function EditorCanvas() {
  // Get nodes and their change handlers
  const { nodes, onNodesChange } = useNodes();

  // Get edges and their change handlers
  const { edges, onEdgesChange, onConnect } = useEdges();

  // Get the ReactFlow-compatible node types
  const { reactFlowNodeTypes } = useNodeRegistry();

  // Get drag and drop handlers
  const { onDragOver, onDrop } = useDragAndDrop();

  // Get workflow state and actions
  const { getWorkflow, isDirty } = useWorkflowEditor();

  const handleSave = async () => {
    const workflow = getWorkflow();
    // Save workflow to your backend
    console.log("Saving workflow:", workflow);
  };

  return (
    <div style={{ width: "100%", height: "100vh" }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onDragOver={onDragOver}
        onDrop={onDrop}
        nodeTypes={reactFlowNodeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
      >
        <Background />
        <Controls />

        {/* Node palette - drag nodes from here */}
        <Panel position="top-left">
          <NodesPanel />
        </Panel>

        {/* Save controls and workflow name */}
        <Panel position="top-right">
          <ControlPanel onSave={handleSave} />
        </Panel>

        {/* Workflow options (frequency, etc.) */}
        <Panel position="bottom-left">
          <OptionsPanel />
        </Panel>

        {/* Properties panel for selected node */}
        <Panel position="bottom-right">
          <DetailPanel />
        </Panel>
      </ReactFlow>
    </div>
  );
}

// Main component that provides the editor context
function WorkflowEditorApp() {
  return (
    <WorkflowEditor nodeTypes={defaultNodeTypes}>
      <EditorCanvas />
    </WorkflowEditor>
  );
}

export default WorkflowEditorApp;
```

## Loading an Existing Workflow

To edit an existing workflow, pass it to the `WorkflowEditor`:

```tsx
import type { Workflow } from "@omega-flow/types";

function WorkflowEditorApp({ workflow }: { workflow: Workflow }) {
  return (
    <WorkflowEditor
      workflow={workflow}
      nodeTypes={defaultNodeTypes}
    >
      <EditorCanvas />
    </WorkflowEditor>
  );
}
```

## Handling Changes

You can listen for workflow changes using callbacks:

```tsx
function WorkflowEditorApp({ workflow }: { workflow: Workflow }) {
  const handleWorkflowChange = (updatedWorkflow: Workflow) => {
    console.log("Workflow changed:", updatedWorkflow);
  };

  const handleDirtyChange = (isDirty: boolean) => {
    console.log("Has unsaved changes:", isDirty);
  };

  return (
    <WorkflowEditor
      workflow={workflow}
      nodeTypes={defaultNodeTypes}
      onWorkflowChange={handleWorkflowChange}
      onDirtyChange={handleDirtyChange}
    >
      <EditorCanvas />
    </WorkflowEditor>
  );
}
```

## Architecture Overview

The editor uses a context-based architecture:

```
WorkflowEditor (Context Provider)
├── WorkflowEditorContext (State Management)
│   ├── nodes, edges, options, name
│   ├── selectedNodeId, isDirty
│   └── nodeTypes (registered node definitions)
│
├── Hooks (Access state and actions)
│   ├── useWorkflowEditor() - Main hook
│   ├── useNodes() - Node operations
│   ├── useEdges() - Edge operations
│   ├── useNodeRegistry() - Node type management
│   ├── useDragAndDrop() - Drag handlers
│   └── useSelectedNode() - Selection management
│
└── Components
    ├── NodesPanel - Draggable node palette
    ├── DetailPanel - Selected node properties
    ├── OptionsPanel - Workflow options
    └── ControlPanel - Save/name controls
```

## Workflow Data Structure

A workflow consists of:

```typescript
interface Workflow {
  id: string;
  name: string;
  flow: {
    nodes: Node[];  // ReactFlow nodes
    edges: Edge[];  // ReactFlow edges
  };
  options: WorkflowOptions;
}

interface WorkflowOptions {
  frequency?: WorkflowFrequency;
  [key: string]: any;  // Extensible
}

interface WorkflowFrequency {
  type: "one_time" | "every_rematch";
  interval?: number;  // seconds, for every_rematch
}
```

## Default Node Types

The editor comes with 6 built-in node types:

| Node Type | Description | Data Structure |
|-----------|-------------|----------------|
| **Trigger** | Starts workflow on event | `{ params: { event: string } }` |
| **Action** | Performs an action | `{ action: string, params: object }` |
| **Condition** | Branches based on rules | `{ conditions: { all: [] } }` |
| **Wait** | Pauses for duration | `{ params: { duration: number } }` |
| **TriggerOrTimeout** | Waits for event or timeout | `{ params: { event: string, duration: number } }` |
| **Exit** | Ends the workflow | `{}` |

## Customizing Panels

Each panel component accepts props for customization:

```tsx
// NodesPanel - filter and customize node items
<NodesPanel
  showDescriptions={true}
  filter={(nodeType) => nodeType.type !== "Exit"}
  renderItem={(nodeType) => <CustomNodeItem nodeType={nodeType} />}
/>

// DetailPanel - customize appearance
<DetailPanel
  showNodeType={true}
  showNodeId={false}
  emptyMessage="Click a node to edit"
/>

// OptionsPanel - add custom options
<OptionsPanel
  showFrequency={true}
  customOptions={<MyCustomOptions />}
/>

// ControlPanel - customize save behavior
<ControlPanel
  showName={true}
  showSaveButton={true}
  saveButtonLabel="Save Workflow"
  onSave={handleSave}
  renderActions={({ isDirty }) => (
    <button disabled={!isDirty}>Custom Action</button>
  )}
/>
```

## Next Steps

- Learn how to [create custom nodes](/guide/custom-nodes)
- Explore the [Components API](/api/components)
- See [Hooks reference](/api/hooks)
