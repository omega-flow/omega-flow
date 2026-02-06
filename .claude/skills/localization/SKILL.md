---
name: localization
description: Adds new UI strings to the editor's i18n system. Use when adding user-facing text, labels, or messages to editor components.
---

# Add Localization Strings

## Key Files

- `packages/editor/src/i18n/types.ts` - `TranslationFunction` and `TranslationDictionary` types
- `packages/editor/src/i18n/defaults.ts` - Default English translations (~70 keys)
- `packages/editor/src/i18n/TranslationContext.tsx` - React context, provider, and `useTranslation` hook

## Translation Key Naming Convention

- `panels.*` - Panel UI (ControlPanel, DetailPanel, NodesPanel, OptionsPanel)
- `nodes.*` - Node view labels and empty states (canvas rendering)
- `nodeDetails.*` - Node detail editor labels and hints (property panel)
- `fields.*` - Shared primitive field strings (DurationField, JsonField)
- `nodeTypes.*` - Default node type definitions (label/description in NodesPanel)

## Steps

When adding new user-facing strings to editor components:

1. Add the key to `packages/editor/src/i18n/defaults.ts`
2. Use `const t = useTranslation()` in the component
3. Replace hardcoded string with `t("your.key.path")`
4. For interpolation, use `{{param}}` syntax: `t("key", { param: "value" })`

## Example

```tsx
// In your component
import { useTranslation } from "../i18n/TranslationContext";

function MyComponent() {
  const t = useTranslation();

  return (
    <div>
      <h1>{t("panels.myPanel.title")}</h1>
      <p>{t("panels.myPanel.description", { count: 5 })}</p>
    </div>
  );
}
```

```ts
// In defaults.ts, add:
panels: {
  myPanel: {
    title: "My Panel",
    description: "You have {{count}} items",
  },
  // ...existing keys
}
```
