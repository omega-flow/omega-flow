/**
 * Condition format shared between the editor and the engine.
 *
 * Top level is implicitly OR between groups; each group is AND (`all`) or
 * OR (`any`) of leaf rules. There is no deeper nesting.
 */

export type ConditionOperator =
  | "equal"
  | "notEqual"
  | "greaterThan"
  | "greaterThanInclusive"
  | "lessThan"
  | "lessThanInclusive"
  | "in"
  | "notIn"
  | "contains"
  | "doesNotContain";

export interface ConditionRule {
  fact: string;
  operator: ConditionOperator | string;
  value: unknown;
}

export interface ConditionGroup {
  operator: "all" | "any";
  conditions: ConditionRule[];
}

export interface Conditions {
  groups: ConditionGroup[];
}
