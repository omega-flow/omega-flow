/**
 * Translation function signature.
 *
 * Accepts a dot-separated key and optional interpolation parameters.
 * Returns the translated string, or the key itself as fallback.
 *
 * @example
 * ```ts
 * const t: TranslationFunction = (key, params) => {
 *   const template = translations[key] ?? key;
 *   if (!params) return template;
 *   return template.replace(/\{\{(\w+)\}\}/g, (_, k) => String(params[k] ?? `{{${k}}}`));
 * };
 *
 * t("nodes.trigger.label"); // "Trigger"
 * t("nodes.condition.ruleCount", { count: "3" }); // "3 rules"
 * ```
 */
export type TranslationFunction = (
  key: string,
  params?: Record<string, string>
) => string;

/**
 * Flat dictionary mapping dot-separated keys to translation strings.
 *
 * Supports `{{param}}` interpolation placeholders.
 *
 * @example
 * ```ts
 * const translations: TranslationDictionary = {
 *   "panels.control.title": "Workflow",
 *   "nodes.condition.ruleCount": "{{count}} rules",
 * };
 * ```
 */
export type TranslationDictionary = Record<string, string>;
