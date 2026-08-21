import type {
  Conditions,
  ConditionGroup,
  ConditionRule,
} from "@omega-flow/types";

import type { ResolutionScope } from "../engine/resolutionScope";
import {
  resolvePath as resolveScopePath,
  resolveValue,
} from "./templateResolver";

/** Fact prefixes that resolve against the resolution scope instead of the facts object. */
const SCOPE_PREFIXES = ["event.", "trigger.", "state."];

/**
 * Evaluate a Conditions tree against a flat facts object.
 *
 * Top-level groups are combined with OR. Inside each group, rules are combined
 * with AND (`all`) or OR (`any`). A `fact` may use dot notation (`user.age`)
 * to reach nested fields.
 *
 * When a `scope` is given, dynamic values are enabled:
 *   - a fact starting with `event.` / `trigger.` / `state.` resolves against
 *     the scope (array indices like `items[0].id` supported); any other fact
 *     keeps its legacy meaning and resolves against `facts`
 *   - a rule `value` string containing `{{path}}` placeholders is resolved
 *     against the scope before comparison (an exact placeholder keeps the
 *     resolved value's type)
 *
 * Empty inputs follow the same math as JS array predicates:
 *   - empty `groups`            → false (any of nothing)
 *   - empty `conditions` + all  → true  (every of nothing)
 *   - empty `conditions` + any  → false (some of nothing)
 */
export function evaluateConditions(
  conditions: Conditions | undefined | null,
  facts: Record<string, unknown>,
  scope?: ResolutionScope
): boolean {
  if (!conditions || !Array.isArray(conditions.groups)) return false;
  return conditions.groups.some((group) => evaluateGroup(group, facts, scope));
}

function evaluateGroup(
  group: ConditionGroup,
  facts: Record<string, unknown>,
  scope?: ResolutionScope
): boolean {
  const rules = group.conditions ?? [];
  if (group.operator === "all") {
    return rules.every((rule) => evaluateRule(rule, facts, scope));
  }
  return rules.some((rule) => evaluateRule(rule, facts, scope));
}

function evaluateRule(
  rule: ConditionRule,
  facts: Record<string, unknown>,
  scope?: ResolutionScope
): boolean {
  const factValue =
    scope && SCOPE_PREFIXES.some((prefix) => rule.fact.startsWith(prefix))
      ? resolveScopePath(scope, rule.fact)
      : resolvePath(facts, rule.fact);
  const ruleValue = scope ? resolveValue(rule.value, scope) : rule.value;
  return applyOperator(rule.operator, factValue, ruleValue);
}

function resolvePath(source: unknown, path: string): unknown {
  if (!path) return undefined;
  const parts = path.split(".");
  let current: unknown = source;
  for (const part of parts) {
    if (current == null || typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

function applyOperator(
  operator: string,
  factValue: unknown,
  ruleValue: unknown
): boolean {
  switch (operator) {
    case "equal":
      return factValue === ruleValue;
    case "notEqual":
      return factValue !== ruleValue;
    case "greaterThan":
      return isNumber(factValue) && isNumber(ruleValue) && factValue > ruleValue;
    case "greaterThanInclusive":
      return isNumber(factValue) && isNumber(ruleValue) && factValue >= ruleValue;
    case "lessThan":
      return isNumber(factValue) && isNumber(ruleValue) && factValue < ruleValue;
    case "lessThanInclusive":
      return isNumber(factValue) && isNumber(ruleValue) && factValue <= ruleValue;
    case "in":
      return Array.isArray(ruleValue) && ruleValue.includes(factValue);
    case "notIn":
      return Array.isArray(ruleValue) && !ruleValue.includes(factValue);
    case "contains":
      if (Array.isArray(factValue)) return factValue.includes(ruleValue);
      if (typeof factValue === "string" && typeof ruleValue === "string") {
        return factValue.includes(ruleValue);
      }
      return false;
    case "doesNotContain":
      if (Array.isArray(factValue)) return !factValue.includes(ruleValue);
      if (typeof factValue === "string" && typeof ruleValue === "string") {
        return !factValue.includes(ruleValue);
      }
      return false;
    default:
      return false;
  }
}

function isNumber(value: unknown): value is number {
  return typeof value === "number" && !Number.isNaN(value);
}
