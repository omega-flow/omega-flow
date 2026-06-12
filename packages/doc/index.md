---
layout: home

hero:
  name: Omega Flow
  text: Workflow Engine & Editor
  tagline: A node-based event-driven workflow engine with a fully customizable React editor
  actions:
    - theme: brand
      text: Get Started
      link: /guide/getting-started
    - theme: alt
      text: API Reference
      link: /api/components

features:
  - title: Event-Driven Architecture
    details: Process workflows based on events with a flexible node-based architecture. Workflows wait for events and react accordingly.
  - title: Visual Workflow Editor
    details: Build workflows visually with drag-and-drop. Built on ReactFlow for a smooth editing experience.
  - title: Type-Safe
    details: Built with TypeScript for full type safety. All types exported for excellent developer experience.
  - title: Extensible Node System
    details: Create custom nodes with your own views and configuration panels. Register them alongside built-in nodes.
  - title: Built-in Node Types
    details: Comes with 6 node types out of the box - Trigger, Action, Condition, Wait, TriggerOrTimeout, and Exit.
  - title: Reusable Primitives
    details: Form field components (TextField, NumberField, JsonField, etc.) for building custom node configuration panels.
---

## Installation

```bash
pnpm add @omega-flow/engine @omega-flow/types
pnpm add @omega-flow/editor    # for the visual editor
```

## Quick Example

```tsx
import { ReactFlow, Background, Controls, Panel } from "@xyflow/react";
import {
  WorkflowEditor,
  NodesPanel,
  DetailPanel,
  ControlPanel,
  useNodes,
  useEdges,
  useNodeRegistry,
  useDragAndDrop,
  defaultNodeTypes,
} from "@omega-flow/editor";

function MyEditor() {
  const { nodes, onNodesChange } = useNodes();
  const { edges, onEdgesChange, onConnect } = useEdges();
  const { reactFlowNodeTypes } = useNodeRegistry();
  const { onDragOver, onDrop } = useDragAndDrop();

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onConnect={onConnect}
      onDragOver={onDragOver}
      onDrop={onDrop}
      nodeTypes={reactFlowNodeTypes}
    >
      <Background />
      <Controls />
      <Panel position="top-left">
        <NodesPanel />
      </Panel>
      <Panel position="bottom-right">
        <DetailPanel />
      </Panel>
    </ReactFlow>
  );
}

function App() {
  return (
    <WorkflowEditor nodeTypes={defaultNodeTypes}>
      <MyEditor />
    </WorkflowEditor>
  );
}
```
