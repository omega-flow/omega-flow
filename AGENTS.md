# Repository Guidelines

## Project Structure & Module Organization
- Monorepo managed by `pnpm` workspaces. Core packages live in `packages/`: `@omega-flow/types` (shared types and schemas in `src/`), `@omega-flow/engine` (workflow engine, manager, nodes under `src/`), and an `editor` placeholder. Tests currently sit in `packages/engine/test`.
- Sample application stubs live under `apps/` for experimentation; prefer adding new demos there rather than inside package folders.
- Generated artifacts go to `dist/` within each package; keep source-only changes in `src/` and avoid committing built output.

## Build, Test, and Development Commands
- Install dependencies with `pnpm install` (enforced by `only-allow pnpm`).
- Build all packages: `pnpm build` (runs `tsup` for each `@omega-flow/*` package, emitting CJS/ESM bundles and `.d.ts` files).
- Package-specific watch build: `pnpm --filter @omega-flow/engine dev`.
- Run all tests: `pnpm test` (Jest, TypeScript-aware). Focused run example: `pnpm --filter @omega-flow/engine test -- WorkflowEngine`.
- Cleanup local artifacts: `pnpm clean` (removes `dist/` and workspace `node_modules`).

## Coding Style & Naming Conventions
- TypeScript-first codebase with `strict` compiler options (see `tsconfig.base.json`); keep types explicit at public boundaries and avoid `any`.
- Use 2-space indentation, ES module imports, and semicolons to match existing files.
- Domain models use `PascalCase` classes ending with `Model` (e.g., `WorkflowModel`, `NodeModel`); methods/properties use `camelCase`. Prefer small pure functions for utilities and keep engine side effects localized.
- When adding schemas or types, colocate them in `packages/types/src` and re-export through the package entrypoint.

## Testing Guidelines
- Jest is configured via `jest.config.base.js`; tests reside alongside engine code in `packages/engine/test` with the `*.test.ts` naming pattern.
- Add focused cases for new workflow states, node transitions, and scheduler/manager interactions. Mock external stores/schedulers rather than hitting real services.
- Keep tests deterministic; avoid timers where possible or use Jest fake timers when validating scheduled events and waits.

## Commit & Pull Request Guidelines
- Commit messages in history favor concise, sentence-case summaries that explain the change and its intent (e.g., “Refactor node model constructors to use static create methods”). Mirror that style and keep commits scoped.
- For PRs, include: what changed, why it matters, how to exercise it (commands, sample workflow), and screenshots/JSON samples if editor-facing. Link related issues or TODOs when applicable and note any added test coverage.
