import React, { createContext, useContext, useMemo } from "react";
import type { TranslationFunction, TranslationDictionary } from "./types";
import { defaultTranslations } from "./defaults";

/**
 * Creates a TranslationFunction from a flat dictionary.
 *
 * Supports `{{param}}` interpolation. Falls back to the key
 * itself when no translation is found.
 */
export function createTranslationFunction(
  dictionary: TranslationDictionary
): TranslationFunction {
  return (key: string, params?: Record<string, string>): string => {
    const template = dictionary[key] ?? key;
    if (!params) return template;
    return template.replace(
      /\{\{(\w+)\}\}/g,
      (_, k) => params[k] ?? `{{${k}}}`
    );
  };
}

const defaultT = createTranslationFunction(defaultTranslations);

const TranslationContext = createContext<TranslationFunction>(defaultT);

export interface TranslationProviderProps {
  children: React.ReactNode;
  /**
   * Custom translation function. When provided, it fully replaces
   * the built-in resolver — giving you total control.
   *
   * Use this to plug in any i18n library (i18next, react-intl, etc.):
   *
   * ```tsx
   * <TranslationProvider translationFn={(key, params) => intl.formatMessage({ id: key }, params)}>
   * ```
   */
  translationFn?: TranslationFunction;
  /**
   * Flat dictionary that is merged on top of the default English strings.
   *
   * Use this for simple overrides or full translations without bringing
   * in an external i18n library:
   *
   * ```tsx
   * <TranslationProvider translations={{ "panels.control.title": "Flujo" }}>
   * ```
   *
   * Ignored when `translationFn` is provided.
   */
  translations?: TranslationDictionary;
}

/**
 * Provides a translation function to all editor components and custom nodes.
 *
 * Three usage modes:
 * 1. **No props** — uses built-in English strings.
 * 2. **`translations` prop** — merges your dictionary on top of defaults.
 * 3. **`translationFn` prop** — you supply the function entirely
 *    (adapter for i18next, react-intl, or any other system).
 */
export function TranslationProvider({
  children,
  translationFn,
  translations,
}: TranslationProviderProps) {
  const t = useMemo(() => {
    if (translationFn) return translationFn;
    if (translations) {
      return createTranslationFunction({
        ...defaultTranslations,
        ...translations,
      });
    }
    return defaultT;
  }, [translationFn, translations]);

  return (
    <TranslationContext.Provider value={t}>
      {children}
    </TranslationContext.Provider>
  );
}

/**
 * Hook to access the translation function.
 *
 * Works inside any component rendered within `<WorkflowEditor>`.
 * Custom node developers use this to translate their own strings.
 *
 * @example
 * ```tsx
 * import { useTranslation } from "@omega-flow/editor";
 *
 * function MyCustomNodeDetail({ node, onChange }: NodeDetailProps) {
 *   const t = useTranslation();
 *   return <TextField label={t("myCustomNode.emailLabel")} ... />;
 * }
 * ```
 */
export function useTranslation(): TranslationFunction {
  return useContext(TranslationContext);
}
