import type { NodeTypeDefinition } from "./types";

// Views
import {
  TriggerNodeView,
  ActionNodeView,
  ConditionNodeView,
  ExitNodeView,
  WaitNodeView,
  TriggerOrTimeoutNodeView,
} from "./views";

// Details
import {
  TriggerNodeDetail,
  ActionNodeDetail,
  ConditionNodeDetail,
  ExitNodeDetail,
  WaitNodeDetail,
  TriggerOrTimeoutNodeDetail,
} from "./details";

// Icons
import {
  TriggerIcon,
  ActionIcon,
  ConditionIcon,
  WaitIcon,
  TriggerOrTimeoutIcon,
  ExitIcon,
} from "./icons";

/**
 * Default node type definitions for the workflow editor.
 * These correspond to the node models in @omega-flow/engine.
 */
export const defaultNodeTypes: NodeTypeDefinition[] = [
  {
    type: "Trigger",
    label: "Trigger",
    description: "Starts the workflow when a specific event occurs",
    Icon: TriggerIcon,
    defaultData: { params: { event: "" } },
    sourceHandles: [{ id: "output", label: "Next" }],
    targetHandles: [],
    ViewComponent: TriggerNodeView,
    DetailComponent: TriggerNodeDetail,
  },
  {
    type: "Action",
    label: "Action",
    description: "Performs an action and continues to the next node",
    Icon: ActionIcon,
    defaultData: { action: "", params: {} },
    sourceHandles: [{ id: "output", label: "Next" }],
    targetHandles: [{ id: "input", label: "In" }],
    ViewComponent: ActionNodeView,
    DetailComponent: ActionNodeDetail,
  },
  {
    type: "Condition",
    label: "Condition",
    description: "Branches the workflow based on conditions",
    Icon: ConditionIcon,
    defaultData: { conditions: { all: [] } },
    sourceHandles: [
      { id: "true", label: "True" },
      { id: "false", label: "False" },
    ],
    targetHandles: [{ id: "input", label: "In" }],
    ViewComponent: ConditionNodeView,
    DetailComponent: ConditionNodeDetail,
  },
  {
    type: "Wait",
    label: "Wait",
    description: "Pauses the workflow for a specified duration",
    Icon: WaitIcon,
    defaultData: { params: { duration: 60000 } },
    sourceHandles: [{ id: "output", label: "Next" }],
    targetHandles: [{ id: "input", label: "In" }],
    ViewComponent: WaitNodeView,
    DetailComponent: WaitNodeDetail,
  },
  {
    type: "TriggerOrTimeout",
    label: "Trigger or Timeout",
    description: "Waits for an event or times out after a duration",
    Icon: TriggerOrTimeoutIcon,
    defaultData: { params: { event: "", duration: 60000 } },
    sourceHandles: [{ id: "output", label: "Next" }],
    targetHandles: [{ id: "input", label: "In" }],
    ViewComponent: TriggerOrTimeoutNodeView,
    DetailComponent: TriggerOrTimeoutNodeDetail,
  },
  {
    type: "Exit",
    label: "Exit",
    description: "Ends the workflow",
    Icon: ExitIcon,
    defaultData: {},
    sourceHandles: [],
    targetHandles: [{ id: "input", label: "In" }],
    ViewComponent: ExitNodeView,
    DetailComponent: ExitNodeDetail,
  },
];

// Re-export types
export * from "./types";

// Re-export views
export * from "./views";

// Re-export details
export * from "./details";

// Re-export icons
export * from "./icons";
