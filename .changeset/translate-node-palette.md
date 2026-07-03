---
"@omega-flow/editor": minor
---

Localize the `NodesPanel` palette. The panel now resolves each node type's display name and description through the editor's translation function instead of rendering the raw `label`/`description`, so the existing `nodeTypes.*` translation keys finally reach the palette. Adds optional `labelKey`/`descriptionKey` fields to `NodeTypeDefinition` (set on all `defaultNodeTypes`); both fall back to the raw `label`/`description` when the key is unset or has no registered translation, so custom nodes and untranslated setups are unaffected.
