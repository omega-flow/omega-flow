# @omega-flow/store-aws

AWS-backed storage and scheduler implementations for [Omega Flow](https://github.com/omega-flow/omega-flow) — a TypeScript engine and visual editor for building and executing event-driven workflows.

The Omega Flow engine is decoupled from any specific database. This package provides production-ready, DynamoDB-backed implementations of the engine's storage interfaces:

- **`WorkflowStore`** — load and save workflow definitions
- **`WorkflowMemory`** — load and save per-subject execution context
- **`WorkflowScheduler`** — schedule future events (timeouts, delayed triggers)

> **Note:** Omega Flow is under active development. Expect breaking changes until we reach a stable release.

## Installation

```bash
pnpm add @omega-flow/store-aws @omega-flow/engine
```

## Documentation

Full documentation and guides: **https://github.com/omega-flow/omega-flow**

## License

MIT
