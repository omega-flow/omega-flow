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
    ViewComponent: TriggerNodeView,
    DetailComponent: TriggerNodeDetail,
  },
  {
    type: "Action",
    label: "Action",
    description: "Performs an action and continues to the next node",
    Icon: ActionIcon,
    defaultData: { action: "", params: {} },
    ViewComponent: ActionNodeView,
    DetailComponent: ActionNodeDetail,
  },
  {
    type: "Condition",
    label: "Condition",
    description: "Branches the workflow based on conditions",
    Icon: ConditionIcon,
    defaultData: { conditions: { all: [] } },
    ViewComponent: ConditionNodeView,
    DetailComponent: ConditionNodeDetail,
  },
  {
    type: "Wait",
    label: "Wait",
    description: "Pauses the workflow for a specified duration",
    Icon: WaitIcon,
    defaultData: { params: { duration: 60000 } },
    ViewComponent: WaitNodeView,
    DetailComponent: WaitNodeDetail,
  },
  {
    type: "TriggerOrTimeout",
    label: "Trigger or Timeout",
    description: "Waits for an event or times out after a duration",
    Icon: TriggerOrTimeoutIcon,
    defaultData: { params: { event: "", duration: 60000 } },
    ViewComponent: TriggerOrTimeoutNodeView,
    DetailComponent: TriggerOrTimeoutNodeDetail,
  },
  {
    type: "Exit",
    label: "Exit",
    description: "Ends the workflow",
    Icon: ExitIcon,
    defaultData: {},
    ViewComponent: ExitNodeView,
    DetailComponent: ExitNodeDetail,
  },
];

/**
 * Merges custom node type definitions into a base list, replacing any
 * built-in entry that shares the same `type` key.
 *
 * Useful for combining {@link defaultNodeTypes} with custom nodes, or for
 * overriding a built-in node's view/detail components without filtering
 * the array yourself.
 *
 * @example
 * ```ts
 * import { defaultNodeTypes, mergeNodeTypes } from "@omega-flow/editor";
 *
 * const nodeTypes = mergeNodeTypes(defaultNodeTypes, [
 *   storeTriggerNodeType,
 *   { ...customTriggerNodeType, type: "Trigger" }, // overrides default
 * ]);
 * ```
 */
export function mergeNodeTypes(
  base: NodeTypeDefinition[],
  overrides: NodeTypeDefinition[],
): NodeTypeDefinition[] {
  const map = new Map(base.map((t) => [t.type, t]));
  for (const override of overrides) {
    map.set(override.type, override);
  }
  return [...map.values()];
}

// Re-export types
export * from "./types";

// Re-export views
export * from "./views";

// Re-export details
export * from "./details";

// Re-export icons
export * from "./icons";
