import type { TranslationFunction } from "./types";

/**
 * Resolves a translation key, falling back to a raw string.
 *
 * Definitions supplied by consumers (node types, handles) may carry either a
 * `*Key` for the editor's translation function or a plain literal, and `t`
 * returns the key itself when nothing is registered for it. This collapses
 * both cases into the string to display.
 */
export function resolveTranslation(
  t: TranslationFunction,
  key: string | undefined,
  fallback: string | undefined,
): string | undefined {
  if (!key) return fallback;
  const translated = t(key);
  return translated === key ? fallback : translated;
}
