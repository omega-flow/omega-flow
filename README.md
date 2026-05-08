# Omega Flow

A TypeScript workflow engine for building and executing event-driven workflows.

## Features

- **Node-based workflow engine** - Define workflows as directed graphs with nodes and edges
- **Event-driven execution** - Workflows respond to events and can wait for specific triggers
- **Per-subject state management** - Each subject (user, order, device) has its own workflow instance and context
- **Pluggable storage** - Bring your own database with simple interfaces for workflow definitions and state
- **Visual editor** - React-based workflow editor (in development)

## Packages

| Package              | Description                                  |
| -------------------- | -------------------------------------------- |
| `@omega-flow/engine` | Core workflow engine that executes workflows |
| `@omega-flow/types`  | TypeScript types and JSON Schema validation  |
| `@omega-flow/editor` | React workflow editor components             |

## Installation

```bash
pnpm add @omega-flow/engine @omega-flow/types
```

## Quick Start

```typescript
import { WorkflowManager } from "@omega-flow/engine";

// Define a workflow
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

// Create manager with store and memory implementations
const manager = new WorkflowManager(workflowStore, workflowMemory);

// Process an event
await manager.acceptEvent({
  type: "user.signup",
  user_id: "123",
  data: { email: "user@example.com" },
});
```

## Node Types

- **Trigger** - Starts workflow when matching event is received
- **Condition** - Routes execution based on rules (built-in evaluator using the shared `Conditions` format)
- **Action** - Performs an action and continues to next node
- **Wait** - Pauses until timeout or specific event
- **Exit** - Terminates the workflow

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   Workflow Manager                      │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐  │
│  │   Store     │  │   Memory    │  │   Scheduler     │  │
│  │ (definitio.)│  │  (context)  │  │ (future events) │  │
│  └─────────────┘  └─────────────┘  └─────────────────┘  │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│                   Workflow Engine                       │
│  ┌─────────────────────────────────────────────────┐    │
│  │              WorkflowModel                      │    │
│  │  ┌─────┐    ┌─────┐    ┌─────┐    ┌─────┐       │    │
│  │  │Node │───▶│Node │───▶│Node │───▶│Node │       │    │
│  │  └─────┘    └─────┘    └─────┘    └─────┘       │    │
│  └─────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────┘
```

## Development

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run tests
pnpm test

# Start sample app (port 5001)
pnpm dev:app

# Start sample server (port 5010)
pnpm dev:server
```

## Documentation

Full documentation available at [packages/doc](packages/doc) or run `pnpm dev:doc` locally.

## License

ISC
