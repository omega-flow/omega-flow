/**
 * Resolve `{{path}}` placeholders in a template string against a scope object.
 *
 * Paths use dot notation with optional array indices, e.g.
 * `trigger.payload.products[0].product_id`. Placeholders may be embedded in a
 * larger string (`product:{{trigger.payload.product_id}}`) — every occurrence
 * is replaced with the stringified resolved value.
 *
 * Returns `undefined` when any placeholder resolves to a missing value
 * (`undefined`/`null`) or to a non-scalar (object/array): a partially
 * resolved template is never returned.
 */
export function resolveTemplate(
  template: string,
  scope: Record<string, unknown>
): string | undefined {
  let failed = false;
  const result = template.replace(
    /\{\{\s*([^{}]+?)\s*\}\}/g,
    (_match, path: string) => {
      const value = resolvePath(scope, path);
      if (value === undefined || value === null || typeof value === "object") {
        failed = true;
        return "";
      }
      return String(value);
    }
  );
  return failed ? undefined : result;
}

/** Matches a string that is exactly one `{{path}}` placeholder. */
const EXACT_PLACEHOLDER = /^\{\{\s*([^{}]+?)\s*\}\}$/;

/**
 * Resolve a single value that may contain `{{path}}` placeholders.
 *
 * - Non-strings and strings without placeholders are returned unchanged.
 * - A string that is exactly one placeholder (`"{{state.fetch.count}}"`)
 *   resolves to the raw typed value at that path (number, boolean, object,
 *   array, ...), or `undefined` when the path is missing.
 * - A string with embedded placeholders resolves via {@link resolveTemplate}
 *   (stringified scalars; `undefined` on any missing/non-scalar placeholder).
 */
export function resolveValue(
  value: unknown,
  scope: Record<string, unknown>
): unknown {
  if (typeof value !== "string") {
    return value;
  }
  const exact = value.match(EXACT_PLACEHOLDER);
  if (exact) {
    const resolved = resolvePath(scope, exact[1]);
    return resolved === null ? undefined : resolved;
  }
  if (value.includes("{{")) {
    return resolveTemplate(value, scope);
  }
  return value;
}

/**
 * Deep-resolve `{{path}}` placeholders in every string found in a params
 * structure (plain objects and arrays are walked; other values pass through).
 * String leaves follow {@link resolveValue} semantics, so an
 * exact-placeholder string keeps the resolved value's type.
 */
export function resolveDeep(
  params: unknown,
  scope: Record<string, unknown>
): unknown {
  if (typeof params === "string") {
    return resolveValue(params, scope);
  }
  if (Array.isArray(params)) {
    return params.map((item) => resolveDeep(item, scope));
  }
  if (params !== null && typeof params === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(params)) {
      result[key] = resolveDeep(value, scope);
    }
    return result;
  }
  return params;
}

/**
 * Resolve a dot-notation path (with optional `[0]` array indices) against a
 * source object. Returns `undefined` when any segment is missing.
 */
export function resolvePath(source: unknown, path: string): unknown {
  const parts = path
    .replace(/\[(\d+)\]/g, ".$1")
    .split(".")
    .filter((part) => part !== "");
  if (parts.length === 0) {
    return undefined;
  }
  let current: unknown = source;
  for (const part of parts) {
    if (current == null || typeof current !== "object") {
      return undefined;
    }
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}
