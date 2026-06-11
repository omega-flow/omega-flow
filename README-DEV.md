# Development Guide

## Prerequisites

- Node.js 20+
- [pnpm](https://pnpm.io/) (enforced — npm/yarn will not work)

## Setup

```bash
git clone git@github.com:omega-flow/omega-flow.git
cd omega-flow
pnpm install
pnpm build
```

## Daily Development

```bash
# Watch mode for packages (types + engine + editor rebuild on change)
pnpm dev:packages

# Run sample app (port 5001) and server (port 5010) in separate terminals
pnpm dev:app
pnpm dev:server

# Run docs site locally
pnpm dev:doc
```

## Testing

```bash
pnpm test                # all packages
pnpm --filter=@omega-flow/engine run test              # single package
pnpm --filter=@omega-flow/engine run test:watch         # watch mode

# Single test file
cd packages/engine && pnpm test WorkflowEngine.SimpleFlows.test.ts
```

## Making Changes — The Changesets Workflow

We use [Changesets](https://github.com/changesets/changesets) to manage versioning and changelogs. Every PR that changes published package code must include a changeset.

### 1. Create a branch and make your changes

```bash
git checkout -b my-feature
# ... make changes, commit as usual
```

### 2. Add a changeset

Before opening a PR, run:

```bash
pnpm changeset
```

This will ask you:
- **Which packages** were affected (it detects them, you confirm)
- **What kind of bump** — `patch` (bug fix), `minor` (new feature), or `major` (breaking change)
- **A summary** of the change (this goes into the changelog)

It creates a markdown file in `.changeset/` — commit it with your PR.

### 3. What NOT to add a changeset for

- Changes to tests only
- Documentation updates
- CI/tooling config changes
- Changes to non-published packages (sample app, sample server)

### 4. Open a PR

Push your branch and open a PR against `master`. CI will run automatically (build, test, lint, publint, attw).

### 5. How releases happen

When PRs with changesets are merged to `master`:

1. The release workflow automatically opens a **"Version Packages"** PR that bumps versions and updates changelogs
2. When that PR is merged, packages are **automatically published to npm** via Trusted Publishing (OIDC — no tokens involved)
3. Internal dependencies are updated automatically (e.g., if `types` bumps, `engine` gets a patch bump too)

You never run `npm publish` manually in steady state.

## Versioning Rules

- Each package is versioned **independently**
- Use **semver**:
  - `patch` (0.1.0 → 0.1.1) — bug fixes, internal refactors
  - `minor` (0.1.0 → 0.2.0) — new features, non-breaking additions
  - `major` (0.2.0 → 1.0.0) — breaking API changes
- When in doubt, use `minor` during 0.x development (breaking changes are expected)

## Commit Timestamps

All commits are automatically normalized to 20:00 local time via a `post-commit` hook. This is handled by Husky — no action needed on your part.

## CI Checks

Every push and PR runs:

- **Build** — all packages compile
- **Test** — all test suites pass
- **Lint** — code style checks
- **Audit** — no known vulnerable dependencies
- **publint** — package.json exports are correct for consumers
- **attw** — TypeScript types resolve correctly for CJS/ESM
- **CodeQL** — static security analysis

## Project Structure

```
omega-flow/
├── packages/
│   ├── types/       # @omega-flow/types — shared types & schemas
│   ├── engine/      # @omega-flow/engine — workflow execution engine
│   ├── editor/      # @omega-flow/editor — React workflow editor
│   ├── store-aws/   # @omega-flow/store-aws — DynamoDB adapters
│   └── doc/         # Documentation site (VitePress)
├── apps/
│   ├── sampleApp/   # React demo app (not published)
│   └── sampleServer/# Express dev server (not published)
├── .changeset/      # Changesets config and pending changesets
├── .github/         # CI, release, docs, and Dependabot workflows
└── .husky/          # Git hooks
```

## Useful Links

- [Documentation](https://omega-flow.github.io/omega-flow/)
- [npm packages](https://www.npmjs.com/org/omega-flow)
- [GitHub Actions](https://github.com/omega-flow/omega-flow/actions)
