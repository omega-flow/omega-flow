/**
 * UI-only types for the visual condition builder.
 *
 * The data shape (`Conditions`, `ConditionGroup`, `ConditionRule`) lives in
 * `@omega-flow/types` and is shared with the engine — the editor and the
 * engine speak the same format directly, with no conversion in between.
 */

import type { Conditions } from "@omega-flow/types";

/** A single condition property that users can select */
export interface ConditionProperty {
  label: string;
  value: string;
  type?: "string" | "number" | "boolean";
}

/** A group of condition properties (rendered as optgroup in selects) */
export interface ConditionPropertyGroup {
  label: string;
  children: ConditionProperty[];
}

/** List of available properties — flat, grouped, or mixed */
export type ConditionProperties = Array<
  ConditionProperty | ConditionPropertyGroup
>;

/** Operator definition for the operator select */
export interface OperatorOption {
  value: string;
  label: string;
}

/** Props for the ConditionBuilder component */
export interface ConditionBuilderProps {
  /** Current conditions in the unified format */
  value: Conditions;
  /** Called when conditions change */
  onChange: (value: Conditions) => void;
  /** Available properties for condition facts */
  properties?: ConditionProperties;
  /** Available operators (defaults to the built-in set) */
  operators?: OperatorOption[];
}

/** Props for the ConditionBuilderDialog component */
export interface ConditionBuilderDialogProps extends ConditionBuilderProps {
  /** Whether the dialog is open */
  open: boolean;
  /** Called to close the dialog */
  onClose: () => void;
}

export function isPropertyGroup(
  item: ConditionProperty | ConditionPropertyGroup
): item is ConditionPropertyGroup {
  return "children" in item && Array.isArray(item.children);
}
