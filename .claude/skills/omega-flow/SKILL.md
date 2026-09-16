---
name: omega-flow
description: Reference documentation for Omega Flow, a node-based event-driven workflow engine with a React editor. Use when working with workflows, nodes, the engine execution model, or the visual editor and need to look up guides or API details.
---

# Omega Flow

Omega Flow is a workflow builder and engine for automating tasks and processes,
built around a node-based, event-driven execution model.

The files under `references/` are synced from this repo's documentation site
(`packages/doc`) via `pnpm sync-skill` — edit the source docs there, not the
copies here.

## Guides (`references/guide/`)

- [Getting Started](references/guide/getting-started.md) - installation and quick start for the editor and engine
- [Core Concepts](references/guide/core-concepts.md) - workflows, nodes, edges, context, subjects
- [Engine Execution](references/guide/engine-execution.md) - event processing lifecycle and node states
- [Engine Custom Nodes](references/guide/engine-custom-nodes.md) - implementing custom node types for the engine
- [Custom Nodes (Editor)](references/guide/custom-nodes.md) - implementing custom node components for the editor
- [Event Subscriptions](references/guide/event-subscriptions.md) - subscribing to workflow events
- [Editor Setup](references/guide/editor-setup.md) - integrating the visual editor
- [Theming](references/guide/theming.md) - customizing editor CSS variables
- [Localization](references/guide/localization.md) - adding UI strings and translations
- [Store AWS](references/guide/store-aws.md) - AWS-backed WorkflowStore and WorkflowMemory implementations

## API Reference (`references/api/`)

- [Engine](references/api/engine.md) - WorkflowModel, NodeModel, and engine classes
- [Components](references/api/components.md) - editor React components
- [Hooks](references/api/hooks.md) - editor React hooks
- [Primitives](references/api/primitives.md) - low-level building blocks
- [Types](references/api/types.md) - shared TypeScript types and schemas
