# Localization

The editor ships with English strings by default and provides a framework-agnostic localization system. You can override individual strings, provide a full translation dictionary, or plug in any external i18n library (i18next, react-intl, etc.).

The same mechanism is available to custom node developers via the `useTranslation` hook.

## Quick Start

### No Setup Required

With zero configuration, the editor renders all UI in English:

```tsx
<WorkflowEditor workflow={workflow}>
  {/* All panels render in English by default */}
</WorkflowEditor>
```

### Override Specific Strings

Pass a `translations` dictionary to override individual keys:

```tsx
import { WorkflowEditor } from "@omega-flow/editor";

const myTranslations = {
  "panels.control.title": "Flujo de trabajo",
  "panels.detail.delete": "Eliminar",
  "panels.nodes.title": "Nodos",
};

<WorkflowEditor workflow={workflow} translations={myTranslations}>
  {/* Overridden strings use your values, everything else stays English */}
</WorkflowEditor>;
```

### Full Translation

Provide a complete dictionary to translate the entire UI:

```tsx
import { WorkflowEditor, defaultTranslations } from "@omega-flow/editor";

// Start from defaults so you know which keys exist
const esTranslations = {
  ...defaultTranslations,
  "panels.control.title": "Flujo de trabajo",
  "panels.control.nameLabel": "Nombre",
  "panels.control.namePlaceholder": "Nombre del flujo",
  "panels.control.saving": "Guardando...",
  "panels.control.savedSuccessfully": "Guardado correctamente",
  "panels.control.failedToSave": "Error al guardar",
  "panels.control.unsavedChanges": "Cambios sin guardar",
  // ... rest of translations
};

<WorkflowEditor workflow={workflow} translations={esTranslations}>
  ...
</WorkflowEditor>;
```

### Plug in an External i18n Library

Use the `translationFn` prop to bridge any i18n system:

::: code-group

```tsx [i18next]
import { useTranslation } from "react-i18next";
import { WorkflowEditor } from "@omega-flow/editor";

function App() {
  const { t } = useTranslation("omega-flow");

  return (
    <WorkflowEditor
      workflow={workflow}
      translationFn={(key, params) => t(key, params)}
    >
      ...
    </WorkflowEditor>
  );
}
```

```tsx [react-intl]
import { useIntl } from "react-intl";
import { WorkflowEditor } from "@omega-flow/editor";

function App() {
  const intl = useIntl();

  return (
    <WorkflowEditor
      workflow={workflow}
      translationFn={(key, params) => intl.formatMessage({ id: key }, params)}
    >
      ...
    </WorkflowEditor>
  );
}
```

:::

When `translationFn` is provided, it fully replaces the built-in resolver. The `translations` prop is ignored.

## Using Translations in Custom Nodes

The `useTranslation` hook is available to any component rendered inside `<WorkflowEditor>`. Custom node developers can use it to translate their own strings.

### Custom Node Detail Example

```tsx
import {
  TextField,
  FieldGroup,
  useTranslation,
  type NodeDetailProps,
} from "@omega-flow/editor";

function SendEmailNodeDetail({ node, onChange }: NodeDetailProps) {
  const t = useTranslation();
  const data = node.data as { to: string; subject: string };

  return (
    <FieldGroup label={t("customNodes.sendEmail.group")}>
      <TextField
        label={t("customNodes.sendEmail.toLabel")}
        value={data.to || ""}
        onChange={(value) => onChange({ ...data, to: value })}
        placeholder={t("customNodes.sendEmail.toPlaceholder")}
      />
      <TextField
        label={t("customNodes.sendEmail.subjectLabel")}
        value={data.subject || ""}
        onChange={(value) => onChange({ ...data, subject: value })}
      />
    </FieldGroup>
  );
}
```

### Custom Node View Example

```tsx
import {
  BaseNodeView,
  useTranslation,
  type NodeViewProps,
} from "@omega-flow/editor";

function SendEmailNodeView({ id, data, selected }: NodeViewProps) {
  const t = useTranslation();
  const nodeData = data as { to?: string };

  return (
    <BaseNodeView
      id={id}
      data={data as Record<string, unknown>}
      selected={selected}
      label={t("customNodes.sendEmail.label")}
      color="#E91E63"
      icon="📧"
      sourceHandles={[{ id: "output" }]}
      targetHandles={[{ id: "input" }]}
    >
      {nodeData.to || <em>{t("customNodes.sendEmail.noRecipient")}</em>}
    </BaseNodeView>
  );
}
```

### Providing Translations for Custom Nodes

Include your custom node keys in the same `translations` dictionary:

```tsx
<WorkflowEditor
  workflow={workflow}
  translations={{
    // Override built-in strings
    "panels.control.title": "Workflow",
    // Add custom node strings
    "customNodes.sendEmail.group": "Email Configuration",
    "customNodes.sendEmail.label": "Send Email",
    "customNodes.sendEmail.toLabel": "Recipient",
    "customNodes.sendEmail.toPlaceholder": "user@example.com",
    "customNodes.sendEmail.subjectLabel": "Subject",
    "customNodes.sendEmail.noRecipient": "No recipient set",
  }}
>
  ...
</WorkflowEditor>
```

If using `translationFn`, your external i18n library handles all keys (both built-in and custom) through the same function.

## Translation Keys Reference

All built-in translation keys are listed below. Import `defaultTranslations` to see the full set programmatically:

```ts
import { defaultTranslations } from "@omega-flow/editor";
console.log(Object.keys(defaultTranslations));
```

## API Reference

### `TranslationFunction`

```typescript
type TranslationFunction = (
  key: string,
  params?: Record<string, string>,
) => string;
```

The core function signature used throughout the editor. Accepts a dot-separated key and optional interpolation parameters.

### `TranslationDictionary`

```typescript
type TranslationDictionary = Record<string, string>;
```

A flat mapping of keys to translation strings. Supports `{{param}}` interpolation placeholders.

### `useTranslation()`

```typescript
function useTranslation(): TranslationFunction;
```

Hook to access the current translation function. Works inside any component rendered within `<WorkflowEditor>`.

### `createTranslationFunction(dictionary)`

```typescript
function createTranslationFunction(
  dictionary: TranslationDictionary,
): TranslationFunction;
```

Utility to create a `TranslationFunction` from a flat dictionary. Used internally; also useful if you want to create standalone translation functions outside of React.

### `defaultTranslations`

```typescript
const defaultTranslations: TranslationDictionary;
```

The complete set of default English translations. Useful as a starting point for creating new translations.

### `WorkflowEditorProps` (translation-related)

| Prop            | Type                    | Description                                                                |
| --------------- | ----------------------- | -------------------------------------------------------------------------- |
| `translationFn` | `TranslationFunction`   | Custom translation function (replaces built-in resolver)                   |
| `translations`  | `TranslationDictionary` | Dictionary merged on top of defaults (ignored when `translationFn` is set) |

## Key Naming Convention

When adding translations for custom nodes, we recommend using a prefix convention:

- **Built-in editor keys:** `panels.*`, `nodes.*`, `nodeDetails.*`, `fields.*`
- **Custom node keys:** `customNodes.<nodeType>.*`
- **App-level keys:** `app.*`

This avoids collisions between the editor's built-in keys and your application's keys.
