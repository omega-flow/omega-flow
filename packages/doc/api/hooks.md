# Hooks

The `@omega-flow/editor` package provides several React hooks for interacting with the editor state.

## useWorkflowEditor

The main hook for accessing workflow editor state and actions.

### Import

```tsx
import { useWorkflowEditor } from "@omega-flow/editor";
```

### Returns

```typescript
interface UseWorkflowEditorReturn {
  // State
  workflow: Workflow | null;
  nodes: Node[];
  edges: Edge[];
  options: WorkflowOptions;
  name: string;
  isDirty: boolean;
  selectedNode: Node | null;
  selectedNodeId: string | null;

  // Actions
  loadWorkflow: (workflow: Workflow) => void;
  resetWorkflow: () => void;
  addNode: (type: string, position: { x: number; y: number }) => void;
  updateNode: (nodeId: string, data: Record<string, unknown>) => void;
  removeNode: (nodeId: string) => void;
  selectNode: (nodeId: string | null) => void;
  addEdge: (connection: Connection) => void;
  removeEdge: (edgeId: string) => void;
  setName: (name: string) => void;
  setOptions: (options: WorkflowOptions) => void;
  getWorkflow: () => Workflow;
  markClean: () => void;
}
```

### State Properties

| Property | Type | Description |
|----------|------|-------------|
| `workflow` | `Workflow \| null` | Original workflow being edited |
| `nodes` | `Node[]` | Current nodes in the flow |
| `edges` | `Edge[]` | Current edges in the flow |
| `options` | `WorkflowOptions` | Workflow options (frequency, etc.) |
| `name` | `string` | Workflow name |
| `isDirty` | `boolean` | Whether there are unsaved changes |
| `selectedNode` | `Node \| null` | Currently selected node |
| `selectedNodeId` | `string \| null` | ID of selected node |

### Actions

| Action | Description |
|--------|-------------|
| `loadWorkflow(workflow)` | Load a workflow into the editor |
| `resetWorkflow()` | Reset to initial/empty state |
| `addNode(type, position)` | Add a new node at position |
| `updateNode(nodeId, data)` | Update node data |
| `removeNode(nodeId)` | Remove a node and its edges |
| `selectNode(nodeId)` | Select a node (or `null` to deselect) |
| `addEdge(connection)` | Add a new edge |
| `removeEdge(edgeId)` | Remove an edge |
| `setName(name)` | Set workflow name |
| `setOptions(options)` | Set workflow options |
| `getWorkflow()` | Get current workflow state |
| `markClean()` | Mark workflow as saved (clears dirty flag) |

### Usage

```tsx
import { useWorkflowEditor } from "@omega-flow/editor";

function MyComponent() {
  const {
    workflow,
    nodes,
    isDirty,
    getWorkflow,
    addNode,
    markClean,
  } = useWorkflowEditor();

  const handleSave = async () => {
    const currentWorkflow = getWorkflow();
    await saveToServer(currentWorkflow);
    markClean();
  };

  const handleAddTrigger = () => {
    addNode("Trigger", { x: 100, y: 100 });
  };

  return (
    <div>
      <p>Nodes: {nodes.length}</p>
      <p>Has changes: {isDirty ? "Yes" : "No"}</p>
      <button onClick={handleAddTrigger}>Add Trigger</button>
      <button onClick={handleSave} disabled={!isDirty}>
        Save
      </button>
    </div>
  );
}
```

---

## useNodes

Hook for working with nodes in the workflow.

### Import

```tsx
import { useNodes } from "@omega-flow/editor";
```

### Returns

```typescript
interface UseNodesReturn {
  nodes: Node[];
  onNodesChange: (changes: NodeChange[]) => void;
  addNode: (type: string, position: { x: number; y: number }) => void;
  updateNode: (nodeId: string, data: Record<string, unknown>) => void;
  removeNode: (nodeId: string) => void;
}
```

| Property | Type | Description |
|----------|------|-------------|
| `nodes` | `Node[]` | Current nodes array |
| `onNodesChange` | `(changes) => void` | Handler for ReactFlow node changes |
| `addNode` | `(type, position) => void` | Add a new node |
| `updateNode` | `(nodeId, data) => void` | Update node data |
| `removeNode` | `(nodeId) => void` | Remove a node |

### Usage

```tsx
import { useNodes } from "@omega-flow/editor";
import { ReactFlow } from "@xyflow/react";

function EditorCanvas() {
  const { nodes, onNodesChange, addNode } = useNodes();

  return (
    <ReactFlow
      nodes={nodes}
      onNodesChange={onNodesChange}
      // ...other props
    />
  );
}
```

---

## useEdges

Hook for working with edges in the workflow.

### Import

```tsx
import { useEdges } from "@omega-flow/editor";
```

### Returns

```typescript
interface UseEdgesReturn {
  edges: Edge[];
  onEdgesChange: (changes: EdgeChange[]) => void;
  onConnect: (connection: Connection) => void;
  addEdge: (connection: Connection) => void;
  removeEdge: (edgeId: string) => void;
}
```

| Property | Type | Description |
|----------|------|-------------|
| `edges` | `Edge[]` | Current edges array |
| `onEdgesChange` | `(changes) => void` | Handler for ReactFlow edge changes |
| `onConnect` | `(connection) => void` | Handler for new connections |
| `addEdge` | `(connection) => void` | Add a new edge |
| `removeEdge` | `(edgeId) => void` | Remove an edge |

### Usage

```tsx
import { useEdges } from "@omega-flow/editor";
import { ReactFlow } from "@xyflow/react";

function EditorCanvas() {
  const { edges, onEdgesChange, onConnect } = useEdges();

  return (
    <ReactFlow
      edges={edges}
      onEdgesChange={onEdgesChange}
      onConnect={onConnect}
      // ...other props
    />
  );
}
```

---

## useNodeRegistry

Hook for accessing registered node types.

### Import

```tsx
import { useNodeRegistry } from "@omega-flow/editor";
```

### Returns

```typescript
interface UseNodeRegistryReturn {
  nodeTypes: Map<string, NodeTypeDefinition>;
  nodeTypesList: NodeTypeDefinition[];
  reactFlowNodeTypes: NodeTypes;
  registerNodeType: (definition: NodeTypeDefinition) => void;
  getNodeType: (type: string) => NodeTypeDefinition | undefined;
}
```

| Property | Type | Description |
|----------|------|-------------|
| `nodeTypes` | `Map<string, NodeTypeDefinition>` | Map of type name to definition |
| `nodeTypesList` | `NodeTypeDefinition[]` | Array of all definitions |
| `reactFlowNodeTypes` | `NodeTypes` | ReactFlow-compatible node types object |
| `registerNodeType` | `(definition) => void` | Register a new node type |
| `getNodeType` | `(type) => NodeTypeDefinition` | Get definition by type name |

### Usage

```tsx
import { useNodeRegistry } from "@omega-flow/editor";
import { ReactFlow } from "@xyflow/react";

function EditorCanvas() {
  const { reactFlowNodeTypes, nodeTypesList } = useNodeRegistry();

  return (
    <ReactFlow
      nodeTypes={reactFlowNodeTypes}
      // ...other props
    />
  );
}
```

### Accessing Node Types

```tsx
function NodeInfo({ nodeType }: { nodeType: string }) {
  const { getNodeType } = useNodeRegistry();
  const definition = getNodeType(nodeType);

  if (!definition) return <span>Unknown type</span>;

  return (
    <div>
      <h3>{definition.label}</h3>
      <p>{definition.description}</p>
    </div>
  );
}
```

---

## useDragAndDrop

Hook for handling drag-and-drop from the nodes panel to the canvas.

### Import

```tsx
import { useDragAndDrop } from "@omega-flow/editor";
```

### Returns

```typescript
interface UseDragAndDropReturn {
  onDragStart: (event: React.DragEvent, nodeType: string) => void;
  onDragOver: (event: React.DragEvent) => void;
  onDrop: (event: React.DragEvent) => void;
}
```

| Property | Type | Description |
|----------|------|-------------|
| `onDragStart` | `(event, nodeType) => void` | Start dragging a node type |
| `onDragOver` | `(event) => void` | Handle drag over canvas |
| `onDrop` | `(event) => void` | Handle drop on canvas |

### Usage

```tsx
import { useDragAndDrop } from "@omega-flow/editor";
import { ReactFlow } from "@xyflow/react";

function EditorCanvas() {
  const { onDragOver, onDrop } = useDragAndDrop();

  return (
    <ReactFlow
      onDragOver={onDragOver}
      onDrop={onDrop}
      // ...other props
    />
  );
}
```

### Custom Drag Source

If building a custom nodes panel:

```tsx
function CustomNodesPanel() {
  const { onDragStart } = useDragAndDrop();

  return (
    <div>
      <div
        draggable
        onDragStart={(e) => onDragStart(e, "Trigger")}
      >
        Trigger Node
      </div>
      <div
        draggable
        onDragStart={(e) => onDragStart(e, "Action")}
      >
        Action Node
      </div>
    </div>
  );
}
```

---

## useSelectedNode

Hook for working with the currently selected node.

### Import

```tsx
import { useSelectedNode } from "@omega-flow/editor";
```

### Returns

```typescript
interface UseSelectedNodeReturn {
  selectedNode: Node | null;
  selectedNodeId: string | null;
  nodeType: NodeTypeDefinition | undefined;
  selectNode: (nodeId: string | null) => void;
  updateSelectedNode: (data: Record<string, unknown>) => void;
  removeSelectedNode: () => void;
}
```

| Property | Type | Description |
|----------|------|-------------|
| `selectedNode` | `Node \| null` | The selected node object |
| `selectedNodeId` | `string \| null` | ID of selected node |
| `nodeType` | `NodeTypeDefinition \| undefined` | Definition for selected node type |
| `selectNode` | `(nodeId) => void` | Select a node |
| `updateSelectedNode` | `(data) => void` | Update selected node's data |
| `removeSelectedNode` | `() => void` | Remove the selected node |

### Usage

```tsx
import { useSelectedNode } from "@omega-flow/editor";

function SelectionInfo() {
  const {
    selectedNode,
    nodeType,
    updateSelectedNode,
    removeSelectedNode,
  } = useSelectedNode();

  if (!selectedNode) {
    return <p>No node selected</p>;
  }

  return (
    <div>
      <h3>{nodeType?.label || selectedNode.type}</h3>
      <p>ID: {selectedNode.id}</p>
      <button onClick={removeSelectedNode}>Delete</button>
    </div>
  );
}
```

---

## useGuidedFlow

One-stop hook for rendering a [guided-mode](/guide/guided-mode) canvas.
Returns the flow augmented with derived "Add node" placeholders, laid out
automatically, plus everything to wire up `<ReactFlow>`.

```tsx
import { ReactFlow } from "@xyflow/react";
import { NodeChooser, useGuidedFlow } from "@omega-flow/editor";

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
      <NodeChooser />
    </ReactFlow>
  );
}
```

### Returns

| Property | Type | Description |
|----------|------|-------------|
| `nodes` | `Node[]` | Real nodes plus derived placeholders (guided mode) |
| `edges` | `Edge[]` | Edges typed for the insertable "+" edge (guided mode) |
| `nodeTypes` | `NodeTypes` | ReactFlow node types map including the placeholder view |
| `edgeTypes` | `EdgeTypes` | ReactFlow edge types map with the insertable edge |
| `reactFlowProps` | `object` | Props to spread onto `<ReactFlow>` |
| `mode` | `EditorMode` | Current editor mode (`"freeform"` \| `"guided"`) |
| `isGuided` | `boolean` | Convenience flag |

In freeform mode the hook is a plain pass-through (no placeholders, standard
change handlers plus `onConnect`), so one canvas component can serve both
modes.

---

## Context Hook

For advanced use cases, you can access the raw context:

```tsx
import { useWorkflowEditorContext } from "@omega-flow/editor";

function AdvancedComponent() {
  const context = useWorkflowEditorContext();
  // Access all state and actions directly
}
```

::: warning
Prefer the specialized hooks (`useWorkflowEditor`, `useNodes`, etc.) over direct context access for better encapsulation.
:::
