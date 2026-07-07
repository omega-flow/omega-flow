# @omega-flow/sample-server

Express-based development server with file-based storage for workflows and contexts.

## Quick Start

```bash
# From monorepo root
pnpm install

# Start development server
cd apps/sampleServer
pnpm dev
```

Server runs at `http://localhost:5010` by default.

## Configuration

| Environment Variable | Default | Description                 |
| -------------------- | ------- | --------------------------- |
| `PORT`               | `5010`  | Server port                 |
| `DB_PATH`            | `./db`  | Path to file-based database |

## File-based Database Structure

```
db/
 - workflows/{domain}/{workflowId}.json
 - contexts/{domain}/{subjectId}/{workflowId}/{instanceId}.json
 - scheduler.json
 - subscriptions.json
```

## API Endpoints

### Health Check

| Method | Endpoint  | Description  |
| ------ | --------- | ------------ |
| GET    | `/health` | Health check |

### Workflows API

| Method | Endpoint                     | Description                         |
| ------ | ---------------------------- | ----------------------------------- |
| GET    | `/api/workflows/:domain`     | List all workflows in domain        |
| GET    | `/api/workflows/:domain/:id` | Get workflow by ID                  |
| POST   | `/api/workflows/:domain`     | Create workflow (ID auto-generated) |
| PUT    | `/api/workflows/:domain/:id` | Update workflow                     |
| DELETE | `/api/workflows/:domain/:id` | Delete workflow                     |

### Contexts API

| Method | Endpoint                                                   | Description                        |
| ------ | ---------------------------------------------------------- | ---------------------------------- |
| GET    | `/api/contexts/:domain`                                    | List all contexts in domain        |
| GET    | `/api/contexts/:domain/:subjectId`                         | List all contexts for subject      |
| GET    | `/api/contexts/:domain/:subjectId/:workflowId`             | List contexts for subject+workflow |
| GET    | `/api/contexts/:domain/:subjectId/:workflowId/:instanceId` | Get specific context               |
| POST   | `/api/contexts/:domain/:subjectId/:workflowId`             | Save context                       |
| DELETE | `/api/contexts/:domain/:subjectId/:workflowId/:instanceId` | Delete context                     |

### Execute API

| Method | Endpoint               | Description                              |
| ------ | ---------------------- | ---------------------------------------- |
| POST   | `/api/execute/:domain` | Execute an event through WorkflowManager |

#### Execute Request Body

```json
{
  "type": "event.type",
  "data": {
    "subjectId": "user-123",
    "customField": "value"
  }
}
```

- `type` (required): Event type that triggers workflows
- `data.subjectId` (required): Identifies the subject for the workflow
- Event `id` and `time` are auto-generated

The response includes a `deliveries` array describing cross-subject
subscription deliveries triggered by the event (empty when no parked
instance subscribed to it).

### Subscriptions API

Active cross-subject event subscriptions, registered automatically when a
workflow instance parks on a trigger node with a `params.match` section.

| Method | Endpoint                 | Description                                     |
| ------ | ------------------------ | ----------------------------------------------- |
| GET    | `/api/subscriptions`     | List active subscriptions (filter: `?domain=`)  |
| DELETE | `/api/subscriptions/:id` | Remove a subscription (`id` from the list, URL-encoded) |

## Postman Collection

Import `postman-collection.json` into Postman for ready-to-use API requests.

## Storage Implementations

This server provides file-based implementations of the engine's storage interfaces:

- **FileWorkflowStore** - Implements `WorkflowStore` interface
- **FileWorkflowMemory** - Implements `WorkflowMemory` interface
- **FileWorkflowScheduler** - Implements `WorkflowScheduler` interface
- **FileSubscriptionStore** - Implements `SubscriptionStore` interface

These can be used as reference for implementing other storage backends (PostgreSQL, MongoDB, etc.).

## Scripts

| Command      | Description                              |
| ------------ | ---------------------------------------- |
| `pnpm dev`   | Start development server with hot reload |
| `pnpm build` | Compile TypeScript to JavaScript         |
| `pnpm start` | Run compiled server                      |

## Example Usage

### Create a Workflow

```bash
curl -X POST http://localhost:5010/api/workflows/default \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Welcome Flow",
    "flow": {
      "nodes": [
        {"id": "trigger-1", "type": "trigger", "position": {"x": 0, "y": 0}, "data": {"eventType": "user.signup"}}
      ],
      "edges": []
    },
    "options": {"frequency": {"type": "one_time"}}
  }'
```

### List Workflows

```bash
curl http://localhost:5010/api/workflows/default
```

### Execute an Event

```bash
curl -X POST http://localhost:5010/api/execute/default \
  -H "Content-Type: application/json" \
  -d '{
    "type": "user.signup",
    "data": {
      "subjectId": "user-123"
    }
  }'
```

### List All Contexts

```bash
curl http://localhost:5010/api/contexts/default
```
