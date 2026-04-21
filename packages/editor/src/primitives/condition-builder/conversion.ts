import type {
  ConditionBuilderValue,
  ConditionGroupValue,
  ConditionRule,
} from "./types";

/**
 * Convert json-rules-engine format to internal builder representation.
 *
 * json-rules-engine format:
 *   { any: [ { all: [...rules] }, { any: [...rules] } ] }
 *   { all: [...rules] }
 *   { any: [...rules] }
 *
 * Builder format:
 *   { groups: [ { operator: 'all'|'any', conditions: [...rules] } ] }
 */
export function fromEngineFormat(
  value: Record<string, unknown>
): ConditionBuilderValue {
  if (!value || typeof value !== "object") {
    return { groups: [{ operator: "all", conditions: [] }] };
  }

  const anyArray = value.any as unknown[] | undefined;
  const allArray = value.all as unknown[] | undefined;

  // Case 1: Top-level `any` with nested groups
  if (Array.isArray(anyArray) && anyArray.length > 0) {
    const groups = anyArray.map((item) => parseGroup(item));
    // If we got groups, use them
    if (groups.some((g) => g !== null)) {
      return {
        groups: groups.filter((g): g is ConditionGroupValue => g !== null),
      };
    }
  }

  // Case 2: Top-level `all` only — wrap in a single group
  if (Array.isArray(allArray) && allArray.length > 0) {
    const conditions = allArray.filter(isLeafCondition).map(normalizeRule);
    return { groups: [{ operator: "all", conditions }] };
  }

  // Case 3: Top-level `any` with flat conditions (no nested groups)
  if (Array.isArray(anyArray) && anyArray.length > 0) {
    const conditions = anyArray.filter(isLeafCondition).map(normalizeRule);
    return { groups: [{ operator: "any", conditions }] };
  }

  // Default: empty
  return { groups: [{ operator: "all", conditions: [] }] };
}

/**
 * Convert internal builder representation back to json-rules-engine format.
 */
export function toEngineFormat(
  builder: ConditionBuilderValue
): Record<string, unknown> {
  const { groups } = builder;

  if (groups.length === 0) {
    return { any: [] };
  }

  // Single group: emit without wrapping in any
  if (groups.length === 1) {
    const group = groups[0];
    return { [group.operator]: group.conditions.map(ruleToEngine) };
  }

  // Multiple groups: wrap in top-level `any`
  return {
    any: groups.map((group) => ({
      [group.operator]: group.conditions.map(ruleToEngine),
    })),
  };
}

function parseGroup(item: unknown): ConditionGroupValue | null {
  if (!item || typeof item !== "object") return null;
  const obj = item as Record<string, unknown>;

  if (Array.isArray(obj.all)) {
    return {
      operator: "all",
      conditions: obj.all.filter(isLeafCondition).map(normalizeRule),
    };
  }
  if (Array.isArray(obj.any)) {
    return {
      operator: "any",
      conditions: obj.any.filter(isLeafCondition).map(normalizeRule),
    };
  }

  // It's a standalone leaf condition at the top level
  if (isLeafCondition(item)) {
    return { operator: "all", conditions: [normalizeRule(item)] };
  }

  return null;
}

function isLeafCondition(item: unknown): boolean {
  if (!item || typeof item !== "object") return false;
  const obj = item as Record<string, unknown>;
  return (
    typeof obj.fact === "string" &&
    typeof obj.operator === "string" &&
    "value" in obj
  );
}

/**
 * Convert an engine rule into the internal builder format.
 * If the rule has a `path` like `$.age`, join it with `fact` → `user.age`.
 */
function normalizeRule(item: unknown): ConditionRule {
  const obj = item as Record<string, unknown>;
  const fact = obj.fact as string;
  const path = typeof obj.path === "string" ? obj.path : undefined;

  let joinedFact = fact;
  if (path) {
    // Strip leading "$." from the path and append to fact
    const cleanPath = path.startsWith("$.") ? path.slice(2) : path;
    if (cleanPath) {
      joinedFact = `${fact}.${cleanPath}`;
    }
  }

  return {
    fact: joinedFact,
    operator: obj.operator as string,
    value: obj.value,
  };
}

/**
 * Convert an internal builder rule into engine format.
 * If the fact contains a dot (e.g. `user.age`), split into
 * `fact: "user"` + `path: "$.age"`.
 */
function ruleToEngine(rule: ConditionRule): Record<string, unknown> {
  const dotIndex = rule.fact.indexOf(".");
  if (dotIndex === -1) {
    return {
      fact: rule.fact,
      operator: rule.operator,
      value: rule.value,
    };
  }

  return {
    fact: rule.fact.slice(0, dotIndex),
    operator: rule.operator,
    value: rule.value,
    path: `$.${rule.fact.slice(dotIndex + 1)}`,
  };
}
