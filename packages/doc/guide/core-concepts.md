# Core Concepts

## Workflow

A workflow is composed of a Flow (nodes + edges), metadata, and options.

## Nodes

Nodes are the building blocks of workflows. Each node can:
- Perform actions
- Wait for events
- Make decisions

### Node Types

- **Trigger**: Accepts events matching a specific event type
- **Condition**: Evaluates conditions and routes to different paths
- **Action**: Performs an action and moves to next node
- **Exit**: Terminates the workflow
- **Wait**: Pauses workflow until timeout or specific event

## Events

Events drive workflow execution. When an event arrives, the workflow engine:
1. Loads the workflow definition and context
2. Passes the event to the current node
3. Processes the event and determines the next node
4. Continues until reaching a waiting state or completion

## Context

Context stores workflow state for each Subject (user, order, device, etc.). It contains:
- `workflowId`: The workflow being executed
- `instanceId`: Unique identifier for this workflow instance
- `currentNodeId`: The node currently waiting for events
- `nodeState`: State data for the current node
- `history`: Execution history
- `isCompleted`: Whether the workflow has finished
