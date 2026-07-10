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

function resolvePath(source: unknown, path: string): unknown {
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
