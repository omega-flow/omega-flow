# Omega Flow

[![CI](https://github.com/omega-flow/omega-flow/actions/workflows/ci.yml/badge.svg)](https://github.com/omega-flow/omega-flow/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/@omega-flow/engine)](https://www.npmjs.com/package/@omega-flow/engine)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

A TypeScript workflow engine and visual editor for building and executing event-driven workflows. Define workflows as directed graphs, process events per subject, and plug in your own storage.

> **Note:** Omega Flow is under active development. APIs and behavior may change as we work through our first production deployments. Feedback and contributions are welcome, but expect breaking changes until we reach a stable release.

## Features

- **Node-based workflow engine** — Workflows are directed graphs of nodes and edges, executed by an event-driven engine
- **Per-subject state** — Each subject (user, order, device, etc.) gets its own workflow instance and context
- **Built-in node types** — Trigger, Action, Condition, Wait, TriggerOrTimeout, and Exit
- **Extensible** — Create custom node types with your own logic and register them alongside built-in nodes
- **Visual editor** — React-based drag-and-drop workflow editor built on ReactFlow
- **Pluggable storage** — Implement simple interfaces (`WorkflowStore`, `WorkflowMemory`, `WorkflowScheduler`) to bring your own database
- **Type-safe** — Written in TypeScript with all types exported

## Packages

| Package | Description |
| --- | --- |
| [`@omega-flow/engine`](packages/engine) | Core workflow engine — executes workflows, manages state, processes events |
| [`@omega-flow/types`](packages/types) | Shared TypeScript types and JSON Schema validation (Ajv) |
| [`@omega-flow/editor`](packages/editor) | React workflow editor components with drag-and-drop |
| [`@omega-flow/store-aws`](packages/store-aws) | AWS adapters — DynamoDB-backed store, memory, and scheduler |

## Installation

```bash
pnpm add @omega-flow/engine @omega-flow/types
```

For the visual editor:

```bash
pnpm add @omega-flow/editor
```

## Quick Start

```typescript
import {
  WorkflowManager,
  InMemoryWorkflowStore,
  InMemoryWorkflowMemory,
} from "@omega-flow/engine";

// Create a workflow definition
const workflow = {
  id: "welcome-flow",
  name: "Welcome Flow",
  flow: {
    nodes: [
      { id: "1", type: "Trigger", data: { params: { event: "user.signup" } } },
      { id: "2", type: "Action", data: { label: "Send welcome email" } },
      { id: "3", type: "Exit", data: {} },
    ],
    edges: [
      { id: "e1-2", source: "1", target: "2" },
      { id: "e2-3", source: "2", target: "3" },
    ],
  },
};

// Set up storage (use your own implementations in production)
const store = new InMemoryWorkflowStore();
const memory = new InMemoryWorkflowMemory();

store.save(workflow);

// Create manager and process events
const manager = new WorkflowManager({ store, memory });

await manager.acceptEvent({
  type: "user.signup",
  user_id: "123",
  data: { email: "user@example.com" },
});
```

## How It Works

**Workflow Manager** orchestrates everything — it loads workflow definitions from the store, maintains per-subject context in memory, and passes events to the engine for processing.

**Workflow Engine** executes a single workflow instance. When an event arrives, the current node decides whether to accept it. If accepted, the node determines the next node, and the engine continues processing until it reaches a node that's waiting for another event, or the workflow completes.

**Nodes** implement two methods: `acceptEvent()` to decide if an event is relevant, and `nextNode()` to determine where execution goes next. This makes it straightforward to add custom node types for your domain.

**Context** tracks the state of each workflow instance per subject — current node, node state, history, and completion status. It's persisted through the `WorkflowMemory` interface so workflows survive restarts.

## Node Types

| Node | Purpose |
| --- | --- |
| **Trigger** | Starts a workflow when a matching event arrives |
| **Condition** | Evaluates rules and routes to "true" or "false" branches |
| **Action** | Performs an action, then continues to the next node |
| **Wait** | Pauses until a timeout expires or a specific event arrives |
| **TriggerOrTimeout** | Waits for a trigger event or timeout, whichever comes first |
| **Exit** | Terminates the workflow |

## Storage Interfaces

The engine is decoupled from any specific database. Implement these interfaces to use your own:

- **`WorkflowStore`** — Load and save workflow definitions
- **`WorkflowMemory`** — Load and save per-subject execution context
- **`WorkflowScheduler`** — Schedule future events (timeouts, delayed triggers)

In-memory implementations are included for development and testing. The `@omega-flow/store-aws` package provides DynamoDB-backed implementations for production use.

## Development

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run all tests
pnpm test

# Watch mode for engine tests
pnpm --filter=@omega-flow/engine run test:watch

# Start sample server (port 5010)
pnpm dev:server

# Start sample app (port 5001)
pnpm dev:app

# Start docs site
pnpm dev:doc
```

## Documentation

Full documentation is available at [omega-flow.github.io/omega-flow](https://omega-flow.github.io/omega-flow/) or locally via `pnpm dev:doc`.

## License

MIT
