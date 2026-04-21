/**
 * Types for the visual condition builder.
 *
 * The builder produces conditions in json-rules-engine format:
 * - Top level is always `any` (OR)
 * - Each group inside can be `all` (AND) or `any` (OR)
 * - Leaf conditions have `fact`, `operator`, and `value`
 */

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

/** A single condition rule (json-rules-engine leaf) */
export interface ConditionRule {
  fact: string;
  operator: string;
  value: unknown;
}

/**
 * A group of conditions with a logical operator.
 * May contain leaf rules or nested groups.
 */
export interface ConditionGroupValue {
  operator: "all" | "any";
  conditions: ConditionRule[];
}

/**
 * Internal representation used by the builder.
 * Top level is always `any` (OR) containing groups.
 */
export interface ConditionBuilderValue {
  groups: ConditionGroupValue[];
}

/** Operator definition for the operator select */
export interface OperatorOption {
  value: string;
  label: string;
}

/** Props for the ConditionBuilder component */
export interface ConditionBuilderProps {
  /** Current conditions in json-rules-engine format */
  value: Record<string, unknown>;
  /** Called when conditions change, receives json-rules-engine format */
  onChange: (value: Record<string, unknown>) => void;
  /** Available properties for condition facts */
  properties?: ConditionProperties;
  /** Available operators (defaults to json-rules-engine built-ins) */
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
