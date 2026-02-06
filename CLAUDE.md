# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Package Manager

**Always use `pnpm` instead of npm.** This is a monorepo managed with pnpm workspaces.

## Build, Test, and Development Commands

### Root-level commands (run all packages):

- Build all packages: `pnpm build`
- Run all tests: `pnpm test`
- Lint all packages: `pnpm lint`
- Clean all build artifacts and node_modules: `pnpm clean`

### Package-level commands:

Navigate to specific package or use pnpm filtering:

**For @omega-flow/engine:**

- Build: `pnpm --filter=@omega-flow/engine run build`
- Run tests: `pnpm --filter=@omega-flow/engine run test`
- Watch mode for tests: `pnpm --filter=@omega-flow/engine run test:watch`
- Dev mode (watch build): `pnpm --filter=@omega-flow/engine run dev`

**For @omega-flow/types:**

- Build: `pnpm --filter=@omega-flow/types run build`
- Run tests: `pnpm --filter=@omega-flow/types run test`
- Dev mode (watch build): `pnpm --filter=@omega-flow/types run dev`

**For @omega-flow/sample-server:**

- Dev server: `cd apps/sampleServer && pnpm dev` (runs on port 5010)
- Build: `pnpm --filter=@omega-flow/sample-server run build`

**For @omega-flow/sample-app:**

- Dev server: `cd apps/sampleApp && pnpm dev` (runs on port 5001)
- Build: `pnpm --filter=@omega-flow/sample-app run build`

**For @omega-flow/doc:**

- Dev server: `cd packages/doc && pnpm dev`
- Build: `pnpm --filter=@omega-flow/doc run build`
- Preview built docs: `cd packages/doc && pnpm preview`

### Running a single test file:

```bash
cd packages/engine
pnpm test WorkflowEngine.SimpleFlows.test.ts
```

## Repository Structure

This is a monorepo containing packages and apps:

### Packages

- **@omega-flow/types** - TypeScript types & JSON Schema (Ajv) for workflow, events, context
- **@omega-flow/engine** - Workflow engine that executes workflows, manages state, and handles events
- **@omega-flow/editor** - React-based workflow editor components (in development)
- **@omega-flow/doc** (`packages/doc`) - VitePress documentation site containing API reference and guides

### Apps

- **@omega-flow/sample-server** (`apps/sampleServer`) - Express development server with file-based DB for workflows and contexts. Implements `WorkflowStore` and `WorkflowMemory` interfaces. Run with `pnpm dev` (port 5010). See `apps/sampleServer/README.md` for API docs.
- **@omega-flow/sample-app** (`apps/sampleApp`) - React + Vite sample application demonstrating the workflow editor. Features a workflow list page and workflow editor page. Uses `@omega-flow/editor` and `@omega-flow/types` packages. Run with `pnpm dev` (port 5001).

## Core Architecture

### Workflow Execution Model

The workflow engine uses a **node-based event-driven architecture** where workflows are represented as directed graphs:

1. **Workflow** = Flow (nodes + edges) + metadata + options
2. **Flow** = Sequence of nodes connected by edges (based on ReactFlow JSON structure)
3. **Node** = A step that can perform actions, wait for events, or make decisions
4. **Edge** = A connection defining flow of execution between nodes

### Key Classes

**WorkflowModel** (`packages/engine/src/engine/WorkflowModel.ts`):

- Manages workflow execution lifecycle
- Handles workflow statuses: `idle`, `waiting`, `processing`, `transforming`, `completed`
- Processes events via `acceptEvent(event)` method
- Maintains execution history and context
- Recursively processes events until workflow reaches a waiting state or completes

**NodeModel** (`packages/engine/src/engine/NodeModel.ts`):

- Base class for all node types
- Two critical methods that subclasses must implement:
  - `acceptEvent(event)`: Returns `true` if event is accepted and processing is complete, `false` if node is pending or doesn't accept the event
  - `nextNode(event)`: Determines which node to process next (returns `NodeModel | null`)
- Uses `setState()`/`getState()` to pass data between `acceptEvent()` and `nextNode()`
- Manages connections to other nodes via edges

**Context** (`packages/types/src/context.ts`):

- Stores workflow state for each Subject (user, order, device, etc.)
- Contains: `workflowId`, `instanceId`, `currentNodeId`, `nodeState`, `history`, `isCompleted`, `startedAt`
  - `instanceId`: Unique identifier for this specific workflow instance (allows multiple instances of same workflow for a Subject)
  - `startedAt`: Timestamp when this workflow instance was started (Unix timestamp in milliseconds)
- Each Subject has its own separate workflow instance with its own Context
- Context is loaded/saved from Workflow Memory to persist execution state

### Event Processing Flow

1. Event arrives → Workflow Manager loads workflow definition and context for the Subject
2. `WorkflowModel.acceptEvent(event)` is called
3. Current node's `acceptEvent(event)` checks if it accepts the event
   - If not accepted (`false` returned): workflow continues waiting for other events
   - If accepted (`true` returned): workflow moves to processing status
4. Current node's `nextNode(event)` determines the next node
5. Workflow moves to next node (status: `transforming`)
6. Recursively processes the same event with the next node until it reaches a waiting state

**IMPORTANT**: When workflow is on a node, that node is **waiting for events**, not yet processed. Processing happens when an event is accepted.

### Node Types

Node implementations in `packages/engine/src/nodes/`:

- **TriggerModel**: Accepts events matching a specific event type
- **ConditionModel**: Evaluates conditions using json-rules-engine, routes to "true" or "false" output handles
- **ActionModel**: Performs an action and moves to next node
- **ExitModel**: Terminates the workflow
- **WaitModel**: Pauses workflow until timeout or specific event
- **TriggerOrTimeoutModel**: Waits for trigger event or timeout, whichever comes first

### Handling Pending/Async Operations

For nodes that need to wait (timeouts, external events, long processes):

1. Node accepts the event in `acceptEvent()` but may return false if still waiting, saving state as needed
2. Node schedules future events (e.g., timeout via Workflow Scheduler)
3. State is saved in node's state via `setState()`
4. When scheduled event arrives, node checks state in `acceptEvent()` to determine if it's resuming
5. `acceptEvent()` may be called multiple times for the same logical operation (start wait, then complete wait)

### Workflow Manager Responsibilities

The Workflow Manager orchestrates multiple workflows:

- Loads workflow definitions from Workflow Store
- Starts new workflows for Subjects when triggering events arrive
  - Some workflows start once per Subject, others can start multiple times (defined in metadata)
- Loads/saves Context from/to Workflow Memory for each Subject
- Passes events to Workflow Engine for processing
- Manages workflow lifecycle across multiple Subjects and workflows

## Coding Guidelines

- Don't fix lint errors unless explicitly requested
- Validate inputs using Ajv and schemas from @omega-flow/types
- Node implementations must override both `acceptEvent()` and `nextNode()` methods
- Use `setState()`/`getState()` to share data between `acceptEvent()` and `nextNode()`
- Test files follow pattern: `WorkflowEngine.*.test.ts` in `packages/engine/test/`

## Editor Localization

The editor (`@omega-flow/editor`) has a built-in localization system that custom node developers can also use.

### Key Files

- `packages/editor/src/i18n/types.ts` - `TranslationFunction` and `TranslationDictionary` types
- `packages/editor/src/i18n/defaults.ts` - Default English translations (~70 keys)
- `packages/editor/src/i18n/TranslationContext.tsx` - React context, provider, and `useTranslation` hook

### Translation Key Naming Convention

- `panels.*` - Panel UI (ControlPanel, DetailPanel, NodesPanel, OptionsPanel)
- `nodes.*` - Node view labels and empty states (canvas rendering)
- `nodeDetails.*` - Node detail editor labels and hints (property panel)
- `fields.*` - Shared primitive field strings (DurationField, JsonField)
- `nodeTypes.*` - Default node type definitions (label/description in NodesPanel)

### Adding New UI Strings

When adding new user-facing strings to editor components:

1. Add the key to `packages/editor/src/i18n/defaults.ts`
2. Use `const t = useTranslation()` in the component
3. Replace hardcoded string with `t("your.key.path")`
4. For interpolation, use `{{param}}` syntax: `t("key", { param: "value" })`

## Editor Theming

The editor uses CSS custom properties (variables) for styling, allowing consumers to customize appearance without framework dependencies.

### Key Files

- `packages/editor/src/styles/variables.css` - All CSS custom properties with defaults (light theme)
- `packages/editor/src/styles/themes/dark.css` - Dark theme overrides
- `packages/editor/src/styles/index.ts` - Exports `themeVars` object and `cssVar` utility

### CSS Variable Naming Convention

Pattern: `--of-{category}-{element}-{property}[-{variant}]`

- `--of-` prefix = Omega Flow (prevents collisions)
- Categories: `color`, `node`, `spacing`, `font`, `radius`, `shadow`, `transition`, `panel`, `field`, `button`
- Examples: `--of-color-bg-primary`, `--of-field-border-focus`, `--of-node-trigger-color`.

### Node Colors

Each node type has a dedicated CSS variable:

- `--of-node-trigger-color` (default: #4CAF50)
- `--of-node-action-color` (default: #2196F3)
- `--of-node-condition-color` (default: #FF9800)
- `--of-node-exit-color` (default: #F44336)
- `--of-node-wait-color` (default: #9C27B0)
- `--of-node-trigger-timeout-color` (default: #607D8B)
