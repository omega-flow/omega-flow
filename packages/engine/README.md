# @omega-flow/engine

Core workflow engine for [Omega Flow](https://github.com/omega-flow/omega-flow) — a TypeScript engine and visual editor for building and executing event-driven workflows.

Workflows are directed graphs of nodes and edges. The engine processes events per subject (user, order, device, etc.), maintaining separate state for each instance. Storage is pluggable, so you can bring your own database.

> **Note:** Omega Flow is under active development. Expect breaking changes until we reach a stable release.

## Installation

```bash
pnpm add @omega-flow/engine @omega-flow/types
```

## Quick Start

```typescript
import {
  WorkflowManager,
  InMemoryWorkflowStore,
  InMemoryWorkflowMemory,
} from "@omega-flow/engine";

const store = new InMemoryWorkflowStore();
const memory = new InMemoryWorkflowMemory();

store.save({
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
});

const manager = new WorkflowManager({ store, memory });

await manager.acceptEvent({
  type: "user.signup",
  user_id: "123",
  data: { email: "user@example.com" },
});
```

In-memory store, memory, and scheduler implementations are included for development and testing. For production, implement the `WorkflowStore`, `WorkflowMemory`, and `WorkflowScheduler` interfaces, or use [`@omega-flow/store-aws`](https://www.npmjs.com/package/@omega-flow/store-aws).

## Documentation

Full documentation and guides: **https://github.com/omega-flow/omega-flow**

## License

MIT
