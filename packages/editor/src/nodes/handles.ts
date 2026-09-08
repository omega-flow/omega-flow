import type { HandleDefinition } from "../context/types";
import type { TranslationFunction } from "../i18n/types";
import { resolveTranslation } from "../i18n/resolve";

/**
 * Handle definitions for the built-in node types.
 *
 * They live here rather than inside the view components because two places
 * need them: the views paint the dots, and the node type registry lets
 * `useEdges` label every edge that leaves a branching handle.
 */

const POSITIVE_COLOR = "var(--of-handle-positive-color, #2E7D32)";
const NEGATIVE_COLOR = "var(--of-handle-negative-color, #C62828)";

/** The single, unnamed input shared by most node types. */
export const defaultTargetHandles: HandleDefinition[] = [{ id: "input" }];

/** The single, unnamed output shared by most node types. */
export const defaultSourceHandles: HandleDefinition[] = [{ id: "output" }];

/** Condition branches: the rule matched, or it did not. */
export const conditionSourceHandles: HandleDefinition[] = [
  {
    id: "true",
    label: "True",
    labelKey: "nodes.condition.handleTrue",
    color: POSITIVE_COLOR,
  },
  {
    id: "false",
    label: "False",
    labelKey: "nodes.condition.handleFalse",
    color: NEGATIVE_COLOR,
  },
];

/** Trigger or Timeout branches: the event arrived, or the wait expired. */
export const triggerOrTimeoutSourceHandles: HandleDefinition[] = [
  {
    id: "trigger",
    label: "Trigger",
    labelKey: "nodes.triggerOrTimeout.handleTrigger",
    color: POSITIVE_COLOR,
  },
  {
    id: "timeout",
    label: "Timeout",
    labelKey: "nodes.triggerOrTimeout.handleTimeout",
    color: NEGATIVE_COLOR,
  },
];

/**
 * The display name for a handle, resolved through the editor's translation
 * function. Returns `undefined` for handles that carry no name at all.
 */
export function resolveHandleLabel(
  handle: HandleDefinition,
  t: TranslationFunction,
): string | undefined {
  return resolveTranslation(t, handle.labelKey, handle.label);
}

/** Copies a set of handles with their labels resolved for display. */
export function resolveHandleLabels(
  handles: HandleDefinition[],
  t: TranslationFunction,
): HandleDefinition[] {
  return handles.map((handle) => ({
    ...handle,
    label: resolveHandleLabel(handle, t),
  }));
}
