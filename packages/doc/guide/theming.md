# Theming

The Omega Flow editor uses CSS custom properties (variables) for styling, making it easy to customize the appearance without any runtime dependencies or build configuration.

## Quick Start

Import the default styles in your application:

```tsx
import "@omega-flow/editor/styles.css";
import { WorkflowEditor } from "@omega-flow/editor";
```

This gives you the default light theme with all CSS variables defined.

## Using Dark Theme

The dark theme requires two things:
1. Import both `styles.css` (base variables) and `themes/dark.css` (dark overrides)
2. Add a `data-omega-flow-theme="dark"` attribute or `omega-flow-theme-dark` class to a wrapper element

### Global Dark Mode

Apply dark theme to the entire app by setting the attribute on `<html>`:

```tsx
import "@omega-flow/editor/styles.css";
import "@omega-flow/editor/themes/dark.css";

// Set on document root for global dark mode
document.documentElement.setAttribute("data-omega-flow-theme", "dark");
```

### Scoped Dark Mode

Apply dark theme to a specific editor instance using a wrapper element:

```tsx
import "@omega-flow/editor/styles.css";
import "@omega-flow/editor/themes/dark.css";

// Only this editor gets the dark theme
<div data-omega-flow-theme="dark">
  <WorkflowEditor>...</WorkflowEditor>
</div>
```

You can also use the class name instead of the data attribute:

```tsx
<div className="omega-flow-theme-dark">
  <WorkflowEditor>...</WorkflowEditor>
</div>
```

::: tip Why a wrapper element?
CSS variables are inherited from parent elements. The dark theme CSS defines variables on elements matching `[data-omega-flow-theme="dark"]` or `.omega-flow-theme-dark`. Without a matching wrapper element, the variables won't be applied and components will use the light theme fallback values.
:::

## Customizing Colors

Override specific CSS variables in your own stylesheet:

```css
/* my-theme.css */
:root {
  /* Change the primary accent color to purple */
  --of-color-interactive-primary: #8B5CF6;
  --of-color-interactive-primary-hover: #7C3AED;

  /* Change node colors */
  --of-node-trigger-color: #10B981;
  --of-node-action-color: #6366F1;
}
```

Then import both files:

```tsx
import "@omega-flow/editor/styles.css";
import "./my-theme.css"; // Your overrides
```

## Scoped Theming

Apply different themes to different editor instances:

```css
.editor-dark {
  --of-color-bg-primary: #1F2937;
  --of-color-text-primary: #F9FAFB;
  --of-panel-bg: #1F2937;
  /* ... more overrides */
}

.editor-brand {
  --of-color-interactive-primary: #E91E63;
  --of-node-trigger-color: #00BCD4;
}
```

```tsx
<div className="editor-dark">
  <WorkflowEditor>...</WorkflowEditor>
</div>

<div className="editor-brand">
  <WorkflowEditor>...</WorkflowEditor>
</div>
```

## Runtime Theme Switching

Switch themes dynamically using React state. Make sure both `styles.css` and `themes/dark.css` are imported:

```tsx
import "@omega-flow/editor/styles.css";
import "@omega-flow/editor/themes/dark.css";

function ThemeToggle() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  return (
    <div data-omega-flow-theme={theme}>
      <button onClick={() => setTheme(t => t === 'light' ? 'dark' : 'light')}>
        Toggle Theme
      </button>
      <WorkflowEditor>...</WorkflowEditor>
    </div>
  );
}
```

When the attribute is `"light"`, the base variables from `styles.css` apply (defined on `:root`). When switched to `"dark"`, the dark overrides from `themes/dark.css` take effect on the wrapper and its descendants.

Or apply theme variables programmatically:

```tsx
function applyTheme(theme: Record<string, string>) {
  const root = document.documentElement;
  Object.entries(theme).forEach(([key, value]) => {
    root.style.setProperty(key, value);
  });
}

// Apply custom theme
applyTheme({
  '--of-color-interactive-primary': '#8B5CF6',
  '--of-node-trigger-color': '#10B981',
});
```

## Without CSS Import

The editor works without importing any CSS files. All components use inline styles with fallback values, so they'll render with the default light theme appearance even if no CSS is loaded.

```tsx
// Works without CSS import - uses fallback values
import { WorkflowEditor } from "@omega-flow/editor";
```

This is useful for:
- Quick prototyping
- Environments where CSS imports are complex
- Maintaining backwards compatibility

## CSS Variable Reference

### Color Palette

```css
/* Background colors */
--of-color-bg-primary: #fff;
--of-color-bg-secondary: #F9FAFB;
--of-color-bg-tertiary: #F3F4F6;
--of-color-bg-disabled: #F3F4F6;

/* Text colors */
--of-color-text-primary: #111827;
--of-color-text-secondary: #374151;
--of-color-text-tertiary: #6B7280;
--of-color-text-muted: #9CA3AF;
--of-color-text-inverse: #fff;

/* Border colors */
--of-color-border-primary: #D1D5DB;
--of-color-border-secondary: #E5E7EB;
--of-color-border-focus: #3B82F6;

/* Interactive colors */
--of-color-interactive-primary: #3B82F6;
--of-color-interactive-primary-hover: #2563EB;
--of-color-interactive-primary-disabled: #93C5FD;

/* Status colors */
--of-color-status-success: #059669;
--of-color-status-error: #DC2626;
--of-color-status-error-bg: #FEE2E2;
--of-color-status-warning: #FF9800;
```

### Node Colors

```css
--of-node-trigger-color: #4CAF50;
--of-node-action-color: #2196F3;
--of-node-condition-color: #FF9800;
--of-node-exit-color: #F44336;
--of-node-wait-color: #9C27B0;
--of-node-trigger-timeout-color: #607D8B;

/* Node common styling */
--of-node-bg: #fff;
--of-node-content-color: #666;
--of-node-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
```

### Node Handles

```css
--of-handle-size: 10px;
--of-handle-label-size: 10px;

/* Branch colors used by multi-output nodes (Condition, Trigger or Timeout) */
--of-handle-positive-color: #2E7D32;
--of-handle-negative-color: #C62828;
```

### Spacing

```css
--of-spacing-1: 4px;
--of-spacing-2: 6px;
--of-spacing-3: 8px;
--of-spacing-4: 10px;
--of-spacing-5: 12px;
--of-spacing-6: 16px;
--of-spacing-7: 20px;
```

### Typography

```css
/* Font sizes */
--of-font-size-xs: 11px;
--of-font-size-sm: 12px;
--of-font-size-md: 13px;
--of-font-size-lg: 14px;

/* Font weights */
--of-font-weight-normal: 400;
--of-font-weight-medium: 500;
--of-font-weight-semibold: 600;

/* Font family */
--of-font-family-base: system-ui, sans-serif;
--of-font-family-mono: monospace;
```

### Border Radius

```css
--of-radius-sm: 4px;
--of-radius-md: 6px;
--of-radius-lg: 8px;
```

### Shadows

```css
--of-shadow-panel: 0 2px 8px rgba(0, 0, 0, 0.1);
--of-shadow-node: 0 2px 4px rgba(0, 0, 0, 0.1);
```

### Transitions

```css
--of-transition-fast: 0.15s;
--of-transition-normal: 0.2s;
```

### Component-Specific Variables

```css
/* Panel */
--of-panel-bg: var(--of-color-bg-primary);
--of-panel-shadow: var(--of-shadow-panel);
--of-panel-radius: var(--of-radius-lg);
--of-panel-padding: var(--of-spacing-5);
--of-panel-title-color: var(--of-color-text-secondary);
--of-panel-title-size: var(--of-font-size-sm);

/* Field */
--of-field-bg: var(--of-color-bg-primary);
--of-field-border: var(--of-color-border-primary);
--of-field-border-focus: var(--of-color-border-focus);
--of-field-border-error: var(--of-color-status-error);
--of-field-radius: var(--of-radius-md);
--of-field-padding: 8px 10px;
--of-field-font-size: var(--of-font-size-md);
--of-field-label-color: var(--of-color-text-secondary);
--of-field-label-size: var(--of-font-size-sm);
--of-field-hint-color: var(--of-color-text-tertiary);
--of-field-error-color: var(--of-color-status-error);

/* Button */
--of-button-primary-bg: var(--of-color-interactive-primary);
--of-button-primary-color: var(--of-color-text-inverse);
--of-button-primary-bg-hover: var(--of-color-interactive-primary-hover);
--of-button-primary-bg-disabled: var(--of-color-interactive-primary-disabled);
--of-button-danger-bg: var(--of-color-status-error-bg);
--of-button-danger-color: var(--of-color-status-error);
--of-button-radius: var(--of-radius-md);
--of-button-padding: 8px 16px;
```

## Using themeVars in Custom Components

When building custom components, you can use the exported `themeVars` object for TypeScript-friendly access to CSS variables:

```tsx
import { themeVars } from "@omega-flow/editor";

const MyCustomPanel = () => (
  <div style={{
    backgroundColor: themeVars.panel.bg,
    borderRadius: themeVars.panel.radius,
    padding: themeVars.panel.padding,
  }}>
    My Custom Content
  </div>
);
```

This ensures your custom components stay consistent with the theme.
