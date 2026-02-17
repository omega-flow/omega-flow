# @omega-flow/sample-app

React + Vite sample application demonstrating the workflow editor.

## Quick Start

```bash
# From monorepo root
pnpm install

# Start development server
cd apps/sampleApp
pnpm dev
```

App runs at `http://localhost:5001` by default.

## Configuration

| Environment Variable | Default                     | Description             |
| -------------------- | --------------------------- | ----------------------- |
| `PORT`               | `5001`                      | Development server port |
| `VITE_API_URL`       | `http://localhost:5010/api` | Backend API URL         |

## Features

- **Workflow List Page** - Browse and manage workflows
- **Workflow Editor Page** - Visual workflow editor using `@omega-flow/editor`

## Tech Stack

- React + TypeScript
- Vite for bundling and HMR
- `@omega-flow/editor` for workflow editing components
- `@omega-flow/types` for type definitions

## Scripts

| Command        | Description                              |
| -------------- | ---------------------------------------- |
| `pnpm dev`     | Start development server with hot reload |
| `pnpm build`   | Build for production                     |
| `pnpm preview` | Preview production build                 |
| `pnpm lint`    | Run ESLint                               |

## Backend

This app expects `@omega-flow/sample-server` to be running at port 5010. Start both servers for full functionality:

```bash
# Terminal 1 - Backend
cd apps/sampleServer && pnpm dev

# Terminal 2 - Frontend
cd apps/sampleApp && pnpm dev
```
