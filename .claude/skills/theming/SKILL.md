---
name: theming
description: Adds or modifies CSS theme variables in the editor. Use when adding new colors, spacing, or other visual styling that should be customizable.
---

# Add Theme Variables

## Key Files

- `packages/editor/src/styles/variables.css` - All CSS custom properties with defaults (light theme)
- `packages/editor/src/styles/themes/dark.css` - Dark theme overrides
- `packages/editor/src/styles/index.ts` - Exports `themeVars` object and `cssVar` utility

## CSS Variable Naming Convention

Pattern: `--of-{category}-{element}-{property}[-{variant}]`

- `--of-` prefix = Omega Flow (prevents collisions)
- Categories: `color`, `node`, `spacing`, `font`, `radius`, `shadow`, `transition`, `panel`, `field`, `button`
- Examples: `--of-color-bg-primary`, `--of-field-border-focus`, `--of-node-trigger-color`

## Node Colors

Each node type has a dedicated CSS variable:

| Variable | Default | Node Type |
|----------|---------|-----------|
| `--of-node-trigger-color` | #4CAF50 | Trigger |
| `--of-node-action-color` | #2196F3 | Action |
| `--of-node-condition-color` | #FF9800 | Condition |
| `--of-node-exit-color` | #F44336 | Exit |
| `--of-node-wait-color` | #9C27B0 | Wait |
| `--of-node-trigger-timeout-color` | #607D8B | TriggerOrTimeout |

## Steps

When adding a new theme variable:

1. Add the CSS variable with default value to `packages/editor/src/styles/variables.css`
2. Add dark theme override (if needed) to `packages/editor/src/styles/themes/dark.css`
3. Use the variable in your component styles with `var(--of-your-variable)`

## Example

```css
/* In variables.css */
:root {
  --of-panel-header-bg: #f5f5f5;
  /* ...existing variables */
}

/* In dark.css */
:root[data-theme="dark"] {
  --of-panel-header-bg: #2d2d2d;
}

/* In your component CSS */
.panel-header {
  background-color: var(--of-panel-header-bg);
}
```
