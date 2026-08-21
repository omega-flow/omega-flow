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
    labelKey: "nodeTypes.trigger.label",
    description: "Starts the workflow when a specific event occurs",
    descriptionKey: "nodeTypes.trigger.description",
    Icon: TriggerIcon,
    defaultData: { params: { event: "" } },
    ViewComponent: TriggerNodeView,
    DetailComponent: TriggerNodeDetail,
  },
  {
    type: "Action",
    label: "Action",
    labelKey: "nodeTypes.action.label",
    description: "Performs an action and continues to the next node",
    descriptionKey: "nodeTypes.action.description",
    Icon: ActionIcon,
    defaultData: { action: "", params: {} },
    ViewComponent: ActionNodeView,
    DetailComponent: ActionNodeDetail,
    // The engine's ActionModel saves resolved params to state as
    // resolvedParams — one field per configured param key
    stateFields: (node) => {
      const params = (node.data as { params?: unknown } | undefined)?.params;
      if (!params || typeof params !== "object" || Array.isArray(params)) {
        return [];
      }
      return Object.keys(params).map((key) => ({
        path: `resolvedParams.${key}`,
      }));
    },
  },
  {
    type: "Condition",
    label: "Condition",
    labelKey: "nodeTypes.condition.label",
    description: "Branches the workflow based on conditions",
    descriptionKey: "nodeTypes.condition.description",
    Icon: ConditionIcon,
    defaultData: { conditions: { all: [] } },
    ViewComponent: ConditionNodeView,
    DetailComponent: ConditionNodeDetail,
    stateFields: [{ path: "conditionResult", type: "boolean" }],
  },
  {
    type: "Wait",
    label: "Wait",
    labelKey: "nodeTypes.wait.label",
    description: "Pauses the workflow for a specified duration",
    descriptionKey: "nodeTypes.wait.description",
    Icon: WaitIcon,
    defaultData: { params: { duration: 60000 } },
    ViewComponent: WaitNodeView,
    DetailComponent: WaitNodeDetail,
    stateFields: [
      { path: "waitStartsAt", type: "number" },
      { path: "waitEndsAt", type: "number" },
    ],
  },
  {
    type: "TriggerOrTimeout",
    label: "Trigger or Timeout",
    labelKey: "nodeTypes.triggerOrTimeout.label",
    description: "Waits for an event or times out after a duration",
    descriptionKey: "nodeTypes.triggerOrTimeout.description",
    Icon: TriggerOrTimeoutIcon,
    defaultData: { params: { event: "", duration: 60000 } },
    ViewComponent: TriggerOrTimeoutNodeView,
    DetailComponent: TriggerOrTimeoutNodeDetail,
    // "trigger" or "timeout", depending on how the wait resolved
    stateFields: [{ path: "resolvedBy", type: "string" }],
  },
  {
    type: "Exit",
    label: "Exit",
    labelKey: "nodeTypes.exit.label",
    description: "Ends the workflow",
    descriptionKey: "nodeTypes.exit.description",
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
