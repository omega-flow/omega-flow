# Getting Started

Welcome to Omega Flow - a node-based event-driven workflow engine with a visual editor.

## Overview

Omega Flow consists of three main packages:

| Package | Description |
|---------|-------------|
| `@omega-flow/types` | TypeScript types and JSON schemas for workflows, events, and context |
| `@omega-flow/engine` | Workflow engine that executes workflows, manages state, and handles events |
| `@omega-flow/editor` | React-based visual workflow editor with customizable components |

## Installation

### For Workflow Editor (Visual Builder)

```bash
pnpm add @omega-flow/editor @omega-flow/types @xyflow/react
```

### For Engine Only (Backend/Execution)

```bash
pnpm add @omega-flow/engine @omega-flow/types
```

## Quick Start: Visual Editor

Here's a minimal workflow editor setup:

```tsx
import React from "react";
import { ReactFlow, Background, Controls, Panel } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  WorkflowEditor,
  NodesPanel,
  DetailPanel,
  useNodes,
  useEdges,
  useNodeRegistry,
  useDragAndDrop,
  defaultNodeTypes,
} from "@omega-flow/editor";

function EditorCanvas() {
  const { nodes, onNodesChange } = useNodes();
  const { edges, onEdgesChange, onConnect } = useEdges();
  const { reactFlowNodeTypes } = useNodeRegistry();
  const { onDragOver, onDrop } = useDragAndDrop();

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
    </div>
  );
}

function App() {
  return (
    <WorkflowEditor nodeTypes={defaultNodeTypes}>
      <EditorCanvas />
    </WorkflowEditor>
  );
}

export default App;
```

## Quick Start: Workflow Engine

For backend execution without the visual editor:

```typescript
import {
  WorkflowManager,
  WorkflowModel,
  InMemoryWorkflowStore,
  InMemoryWorkflowMemory,
  InMemoryWorkflowScheduler,
  nodeModels,
} from "@omega-flow/engine";
import type { Workflow, Event } from "@omega-flow/types";

// Define a workflow
const welcomeWorkflow: Workflow = {
  id: "welcome",
  name: "Welcome Flow",
  flow: {
    nodes: [
      { id: "t1", type: "Trigger", data: { params: { event: "user.signup" } }, position: { x: 0, y: 0 } },
      { id: "a1", type: "Action", data: { action: "sendWelcomeEmail" }, position: { x: 0, y: 100 } },
      { id: "e1", type: "Exit", data: {}, position: { x: 0, y: 200 } },
    ],
    edges: [
      { id: "e1-t1-a1", source: "t1", target: "a1" },
      { id: "e2-a1-e1", source: "a1", target: "e1" },
    ],
  },
  options: { frequency: { type: "one_time" } }
};

// Create manager
const manager = new WorkflowManager({
  workflowStore: new InMemoryWorkflowStore("default", [welcomeWorkflow]),
  workflowMemory: new InMemoryWorkflowMemory(),
  workflowScheduler: new InMemoryWorkflowScheduler(),
  nodeModels,
  eventExtractor: (event) => ["default", event.data.userId],
});

// Process an event
const event: Event = {
  id: "evt-1",
  type: "user.signup",
  time: Date.now(),
  data: { userId: "user-123" }
};

await manager.processEvent(event);
```

## Key Concepts

### Workflow Structure

A workflow is a directed graph with nodes and edges:

```typescript
interface Workflow {
  id: string;
  name: string;
  flow: {
    nodes: Node[];  // Steps in the workflow
    edges: Edge[];  // Connections between steps
  };
  options: WorkflowOptions;
}
```

### Built-in Node Types

The editor comes with 6 node types:

| Node | Purpose |
|------|---------|
| **Trigger** | Starts workflow on an event |
| **Action** | Performs an action |
| **Condition** | Branches based on rules |
| **Wait** | Pauses for a duration |
| **TriggerOrTimeout** | Waits for event or times out |
| **Exit** | Ends the workflow |

### Events

Events drive workflow execution:

```typescript
interface Event {
  id: string;
  time: number;    // Unix timestamp (ms)
  type: string;    // e.g., "user.signup"
  data?: any;      // Optional payload
}
```

## Sample Application

Check out the sample app in `apps/sampleApp` for a complete implementation:

```bash
# From the monorepo root
cd apps/sampleApp
pnpm dev
```

The sample app demonstrates:
- Setting up the workflow editor
- Loading and saving workflows
- Auto-save functionality
- Integration with a backend API

## Project Structure

```
omega-flow/
├── packages/
│   ├── types/     # TypeScript types & schemas
│   ├── engine/    # Workflow execution engine
│   └── editor/    # Visual editor components
└── apps/
    ├── sampleApp/    # Sample React application
    └── sampleServer/ # Sample Express API server
```

## Next Steps

1. **[Core Concepts](/guide/core-concepts)** - Understand workflows, nodes, events, and context
2. **[Executing Workflows](/guide/engine-execution)** - Detailed guide for running workflows with the engine
3. **[Editor Setup](/guide/editor-setup)** - Detailed guide for setting up the visual editor
4. **[Custom Nodes (Engine)](/guide/engine-custom-nodes)** - Create custom node execution logic
5. **[Custom Nodes (Editor)](/guide/custom-nodes)** - Create custom node visual components
6. **[API Reference](/api/components)** - Explore all editor components and hooks

## Development Commands

### Build all packages

```bash
pnpm build
```

### Run tests

```bash
pnpm test
```

### Run sample application

```bash
# Start the backend server (port 5010)
cd apps/sampleServer && pnpm dev

# In another terminal, start the frontend (port 5173)
cd apps/sampleApp && pnpm dev
```

## TypeScript Support

All packages are written in TypeScript with full type definitions exported:

```typescript
import type {
  Workflow,
  WorkflowOptions,
  WorkflowFrequency,
  Event,
  Context,
  Node,
  Edge,
} from "@omega-flow/types";

import type {
  NodeTypeDefinition,
  NodeViewProps,
  NodeDetailProps,
  WorkflowEditorProps,
} from "@omega-flow/editor";
```
