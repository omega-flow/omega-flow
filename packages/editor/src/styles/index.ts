/**
 * CSS Variable utilities for Omega Flow Editor theming
 */

/**
 * Creates a CSS variable reference with optional fallback
 */
export function cssVar(name: string, fallback?: string): string {
  return fallback ? `var(${name}, ${fallback})` : `var(${name})`;
}

/**
 * Common style variable references with fallbacks
 * Use these in component styles for consistent theming
 */
export const themeVars = {
  // Colors
  color: {
    bgPrimary: "var(--of-color-bg-primary, #fff)",
    bgSecondary: "var(--of-color-bg-secondary, #F9FAFB)",
    bgTertiary: "var(--of-color-bg-tertiary, #F3F4F6)",
    bgDisabled: "var(--of-color-bg-disabled, #F3F4F6)",
    textPrimary: "var(--of-color-text-primary, #111827)",
    textSecondary: "var(--of-color-text-secondary, #374151)",
    textTertiary: "var(--of-color-text-tertiary, #6B7280)",
    textMuted: "var(--of-color-text-muted, #9CA3AF)",
    textInverse: "var(--of-color-text-inverse, #fff)",
    borderPrimary: "var(--of-color-border-primary, #D1D5DB)",
    borderSecondary: "var(--of-color-border-secondary, #E5E7EB)",
    borderFocus: "var(--of-color-border-focus, #3B82F6)",
    interactivePrimary: "var(--of-color-interactive-primary, #3B82F6)",
    interactivePrimaryHover: "var(--of-color-interactive-primary-hover, #2563EB)",
    interactivePrimaryDisabled: "var(--of-color-interactive-primary-disabled, #93C5FD)",
    statusSuccess: "var(--of-color-status-success, #059669)",
    statusError: "var(--of-color-status-error, #DC2626)",
    statusErrorBg: "var(--of-color-status-error-bg, #FEE2E2)",
    statusWarning: "var(--of-color-status-warning, #FF9800)",
    accent: "var(--of-color-accent, #7C3AED)",
    accentBg: "var(--of-color-accent-bg, #EDE9FE)",
  },

  // Node colors
  node: {
    trigger: "var(--of-node-trigger-color, #4CAF50)",
    action: "var(--of-node-action-color, #2196F3)",
    condition: "var(--of-node-condition-color, #FF9800)",
    exit: "var(--of-node-exit-color, #F44336)",
    wait: "var(--of-node-wait-color, #9C27B0)",
    triggerTimeout: "var(--of-node-trigger-timeout-color, #607D8B)",
    bg: "var(--of-node-bg, #fff)",
    contentColor: "var(--of-node-content-color, #666)",
    shadow: "var(--of-node-shadow, 0 2px 4px rgba(0, 0, 0, 0.1))",
  },

  // Spacing
  spacing: {
    1: "var(--of-spacing-1, 4px)",
    2: "var(--of-spacing-2, 6px)",
    3: "var(--of-spacing-3, 8px)",
    4: "var(--of-spacing-4, 10px)",
    5: "var(--of-spacing-5, 12px)",
    6: "var(--of-spacing-6, 16px)",
    7: "var(--of-spacing-7, 20px)",
  },

  // Typography
  font: {
    sizeXs: "var(--of-font-size-xs, 11px)",
    sizeSm: "var(--of-font-size-sm, 12px)",
    sizeMd: "var(--of-font-size-md, 13px)",
    sizeLg: "var(--of-font-size-lg, 14px)",
    weightNormal: "var(--of-font-weight-normal, 400)",
    weightMedium: "var(--of-font-weight-medium, 500)",
    weightSemibold: "var(--of-font-weight-semibold, 600)",
    familyBase: "var(--of-font-family-base, system-ui, sans-serif)",
    familyMono: "var(--of-font-family-mono, monospace)",
  },

  // Border radius
  radius: {
    sm: "var(--of-radius-sm, 4px)",
    md: "var(--of-radius-md, 6px)",
    lg: "var(--of-radius-lg, 8px)",
  },

  // Shadows
  shadow: {
    panel: "var(--of-shadow-panel, 0 2px 8px rgba(0, 0, 0, 0.1))",
    node: "var(--of-shadow-node, 0 2px 4px rgba(0, 0, 0, 0.1))",
  },

  // Transitions
  transition: {
    fast: "var(--of-transition-fast, 0.15s)",
    normal: "var(--of-transition-normal, 0.2s)",
  },

  // Component-specific
  panel: {
    bg: "var(--of-panel-bg, #fff)",
    shadow: "var(--of-panel-shadow, 0 2px 8px rgba(0, 0, 0, 0.1))",
    radius: "var(--of-panel-radius, 8px)",
    padding: "var(--of-panel-padding, 12px)",
    titleColor: "var(--of-panel-title-color, #374151)",
    titleSize: "var(--of-panel-title-size, 12px)",
  },

  field: {
    bg: "var(--of-field-bg, #fff)",
    border: "var(--of-field-border, #D1D5DB)",
    borderFocus: "var(--of-field-border-focus, #3B82F6)",
    borderError: "var(--of-field-border-error, #DC2626)",
    radius: "var(--of-field-radius, 6px)",
    padding: "var(--of-field-padding, 8px 10px)",
    fontSize: "var(--of-field-font-size, 13px)",
    labelColor: "var(--of-field-label-color, #374151)",
    labelSize: "var(--of-field-label-size, 12px)",
    hintColor: "var(--of-field-hint-color, #6B7280)",
    errorColor: "var(--of-field-error-color, #DC2626)",
  },

  button: {
    primaryBg: "var(--of-button-primary-bg, #3B82F6)",
    primaryColor: "var(--of-button-primary-color, #fff)",
    primaryBgHover: "var(--of-button-primary-bg-hover, #2563EB)",
    primaryBgDisabled: "var(--of-button-primary-bg-disabled, #93C5FD)",
    dangerBg: "var(--of-button-danger-bg, #FEE2E2)",
    dangerColor: "var(--of-button-danger-color, #DC2626)",
    radius: "var(--of-button-radius, 6px)",
    padding: "var(--of-button-padding, 8px 16px)",
  },
} as const;
