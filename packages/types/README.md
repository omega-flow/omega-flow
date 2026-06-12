# @omega-flow/types

Shared TypeScript types and JSON Schema validation for [Omega Flow](https://github.com/omega-flow/omega-flow) — a TypeScript engine and visual editor for building and executing event-driven workflows.

This package contains the type definitions and [Ajv](https://ajv.js.org/) JSON Schemas for workflows, nodes, edges, events, and context that are shared across the Omega Flow packages.

> **Note:** Omega Flow is under active development. Expect breaking changes until we reach a stable release.

## Installation

```bash
pnpm add @omega-flow/types
```

## Usage

```typescript
import type { Workflow, Event, Context } from "@omega-flow/types";
```

It is typically installed alongside [`@omega-flow/engine`](https://www.npmjs.com/package/@omega-flow/engine).

## Documentation

Full documentation and guides: **https://github.com/omega-flow/omega-flow**

## License

MIT
