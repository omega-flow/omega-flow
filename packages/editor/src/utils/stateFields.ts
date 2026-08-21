import type { Node } from "@omega-flow/types";

import type {
  NodeTypeDefinition,
  StateFieldDefinition,
} from "../context/types";
import type { TranslationFunction } from "../i18n/types";

/**
 * Resolve the state fields a node exposes for dynamic value references,
 * evaluating the function form of {@link NodeTypeDefinition.stateFields}
 * against the concrete node. Returns an empty list when the type declares
 * nothing (or the definition is unknown).
 */
export function getStateFields(
  definition: NodeTypeDefinition | undefined,
  node: Node
): StateFieldDefinition[] {
  const stateFields = definition?.stateFields;
  if (!stateFields) {
    return [];
  }
  if (typeof stateFields === "function") {
    try {
      return stateFields(node) ?? [];
    } catch {
      return [];
    }
  }
  return stateFields;
}

/**
 * Display label for a state field: translated `labelKey` when registered,
 * then `label`, then the raw `path`.
 */
export function getStateFieldLabel(
  field: StateFieldDefinition,
  t: TranslationFunction
): string {
  if (field.labelKey) {
    const translated = t(field.labelKey);
    if (translated !== field.labelKey) {
      return translated;
    }
  }
  return field.label ?? field.path;
}
