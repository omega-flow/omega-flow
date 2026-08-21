import React, { useRef, useState } from "react";
import type { Node } from "@omega-flow/types";
import { Field } from "./Field";
import { useOptionalWorkflowEditorContext } from "../context/WorkflowEditorContext";
import { useTranslation } from "../i18n";
import { getNodeName } from "../utils/nodeName";
import { getStateFields, getStateFieldLabel } from "../utils/stateFields";

/** True when the value contains a `{{path}}` template placeholder. */
export function isDynamicValue(value: string): boolean {
  return /\{\{[^{}]+\}\}/.test(value);
}

export interface DynamicValueInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  error?: boolean;
  /** Inline style overrides for the outer row (e.g. flex sizing in compact rows) */
  style?: React.CSSProperties;
}

const rowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "stretch",
  gap: "var(--of-spacing-1, 4px)",
  position: "relative",
  minWidth: 0,
};

const inputStyle: React.CSSProperties = {
  padding: "var(--of-field-padding, 8px 10px)",
  borderRadius: "var(--of-field-radius, 6px)",
  border: "1px solid var(--of-field-border, #D1D5DB)",
  fontSize: "var(--of-field-font-size, 13px)",
  outline: "none",
  transition: "border-color var(--of-transition-fast, 0.15s)",
  color: "var(--of-color-text-primary, #111827)",
  backgroundColor: "var(--of-field-bg, #fff)",
  flex: 1,
  minWidth: 0,
};

const dynamicInputStyle: React.CSSProperties = {
  fontFamily: "var(--of-font-family-mono, monospace)",
  fontSize: "var(--of-font-size-sm, 12px)",
};

const badgeStyle: React.CSSProperties = {
  position: "absolute",
  top: "-7px",
  right: "28px",
  fontSize: "9px",
  lineHeight: 1,
  padding: "2px 5px",
  borderRadius: "var(--of-radius-sm, 4px)",
  backgroundColor: "var(--of-color-accent-bg, #EDE9FE)",
  color: "var(--of-color-accent, #7C3AED)",
  fontWeight: "var(--of-font-weight-semibold, 600)" as React.CSSProperties["fontWeight"],
  textTransform: "uppercase",
  letterSpacing: "0.5px",
  pointerEvents: "none",
};

const pickerButtonStyle: React.CSSProperties = {
  padding: "0 var(--of-spacing-2, 6px)",
  borderRadius: "var(--of-field-radius, 6px)",
  border: "1px solid var(--of-field-border, #D1D5DB)",
  backgroundColor: "var(--of-field-bg, #fff)",
  color: "var(--of-color-text-tertiary, #6B7280)",
  cursor: "pointer",
  fontSize: "var(--of-font-size-sm, 12px)",
  fontFamily: "var(--of-font-family-mono, monospace)",
  flexShrink: 0,
};

const menuStyle: React.CSSProperties = {
  position: "absolute",
  top: "100%",
  right: 0,
  marginTop: "2px",
  zIndex: 20,
  minWidth: "200px",
  maxHeight: "240px",
  overflowY: "auto",
  backgroundColor: "var(--of-panel-bg, #fff)",
  border: "1px solid var(--of-color-border-secondary, #E5E7EB)",
  borderRadius: "var(--of-field-radius, 6px)",
  boxShadow: "var(--of-panel-shadow, 0 2px 8px rgba(0,0,0,0.1))",
  padding: "var(--of-spacing-1, 4px)",
};

const menuItemStyle: React.CSSProperties = {
  display: "block",
  width: "100%",
  textAlign: "left",
  padding: "var(--of-spacing-2, 6px) var(--of-spacing-3, 8px)",
  border: "none",
  background: "none",
  borderRadius: "var(--of-radius-sm, 4px)",
  fontSize: "var(--of-font-size-sm, 12px)",
  color: "var(--of-color-text-primary, #111827)",
  cursor: "pointer",
};

const menuGroupStyle: React.CSSProperties = {
  padding: "var(--of-spacing-2, 6px) var(--of-spacing-3, 8px) 2px",
  fontSize: "var(--of-font-size-xs, 11px)",
  fontWeight: "var(--of-font-weight-semibold, 600)" as React.CSSProperties["fontWeight"],
  color: "var(--of-color-text-muted, #9CA3AF)",
  textTransform: "uppercase",
  letterSpacing: "0.5px",
};

const menuItemMetaStyle: React.CSSProperties = {
  marginLeft: "var(--of-spacing-2, 6px)",
  fontSize: "var(--of-font-size-xs, 11px)",
  color: "var(--of-color-text-muted, #9CA3AF)",
};

const backButtonStyle: React.CSSProperties = {
  ...menuItemStyle,
  color: "var(--of-color-text-tertiary, #6B7280)",
  fontSize: "var(--of-font-size-xs, 11px)",
};

/**
 * Bare input that accepts a literal value or a `{{path}}` dynamic template.
 *
 * Shows a "dynamic" badge when the value contains a template, and a
 * two-level picker for the three dynamic sources: current event
 * (`{{event.…}}`), trigger event (`{{trigger.…}}`) and node state — pick a
 * node (shown by its display name), then one of the state fields its type
 * declares via `NodeTypeDefinition.stateFields`, inserting a complete
 * `{{state.<nodeId>.<path>}}` reference. References always use the node id,
 * so renaming nodes never breaks them; a "custom path" entry covers fields
 * the type doesn't declare. The node list comes from the editor context;
 * outside a WorkflowEditorProvider the picker degrades to the event/trigger
 * entries.
 *
 * Use this inside compact layouts (e.g. condition rows); for a labeled form
 * field use {@link DynamicValueField}.
 */
export function DynamicValueInput({
  value,
  onChange,
  placeholder,
  disabled,
  error,
  style,
}: DynamicValueInputProps) {
  const t = useTranslation();
  const editor = useOptionalWorkflowEditorContext();
  const inputRef = useRef<HTMLInputElement>(null);
  // Picker state: closed, root level, or drilled into one node's fields
  const [menu, setMenu] = useState<"closed" | "root" | Node>("closed");

  /**
   * Insert a snippet at the caret. `caretFromEnd` positions the caret that
   * many characters before the snippet's end — 2 leaves it just before the
   * closing braces of an incomplete template, 0 goes after a complete one.
   */
  const insert = (snippet: string, caretFromEnd: number) => {
    const input = inputRef.current;
    const start = input?.selectionStart ?? value.length;
    const end = input?.selectionEnd ?? value.length;
    const next = value.slice(0, start) + snippet + value.slice(end);
    onChange(next);
    setMenu("closed");
    requestAnimationFrame(() => {
      if (input) {
        const caret = start + snippet.length - caretFromEnd;
        input.focus();
        input.setSelectionRange(caret, caret);
      }
    });
  };

  const dynamic = isDynamicValue(value);
  const nodes = editor?.nodes ?? [];

  return (
    <div style={{ ...rowStyle, ...style }}>
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        style={{
          ...inputStyle,
          ...(dynamic ? dynamicInputStyle : {}),
          borderColor: error
            ? "var(--of-field-border-error, #DC2626)"
            : dynamic
              ? "var(--of-color-accent, #7C3AED)"
              : "var(--of-field-border, #D1D5DB)",
          backgroundColor: disabled
            ? "var(--of-color-bg-disabled, #F3F4F6)"
            : "var(--of-field-bg, #fff)",
        }}
      />
      {dynamic && <span style={badgeStyle}>{t("fields.dynamicValue.dynamicBadge")}</span>}
      <button
        type="button"
        title={t("fields.dynamicValue.insertTitle")}
        disabled={disabled}
        style={pickerButtonStyle}
        onClick={() => setMenu(menu === "closed" ? "root" : "closed")}
      >
        {"{…}"}
      </button>
      {menu === "root" && (
        <div style={menuStyle} onMouseLeave={() => setMenu("closed")}>
          <button
            type="button"
            style={menuItemStyle}
            onClick={() => insert("{{event.}}", 2)}
          >
            {t("fields.dynamicValue.currentEvent")}
          </button>
          <button
            type="button"
            style={menuItemStyle}
            onClick={() => insert("{{trigger.}}", 2)}
          >
            {t("fields.dynamicValue.triggerEvent")}
          </button>
          {nodes.length > 0 && (
            <>
              <div style={menuGroupStyle}>
                {t("fields.dynamicValue.nodeStateGroup")}
              </div>
              {nodes.map((node) => (
                <button
                  key={node.id}
                  type="button"
                  style={menuItemStyle}
                  onClick={() => setMenu(node)}
                >
                  {getNodeName(node)}
                  <span style={menuItemMetaStyle}>›</span>
                </button>
              ))}
            </>
          )}
        </div>
      )}
      {menu !== "closed" && menu !== "root" && (
        <div style={menuStyle} onMouseLeave={() => setMenu("closed")}>
          <button
            type="button"
            style={backButtonStyle}
            onClick={() => setMenu("root")}
          >
            ‹ {t("fields.dynamicValue.back")}
          </button>
          <div style={menuGroupStyle}>{getNodeName(menu)}</div>
          {getStateFields(
            menu.type ? editor?.nodeTypes.get(menu.type) : undefined,
            menu
          ).map((field) => (
            <button
              key={field.path}
              type="button"
              style={menuItemStyle}
              onClick={() => insert(`{{state.${menu.id}.${field.path}}}`, 0)}
            >
              {getStateFieldLabel(field, t)}
              {field.type && <span style={menuItemMetaStyle}>{field.type}</span>}
            </button>
          ))}
          <button
            type="button"
            style={menuItemStyle}
            onClick={() => insert(`{{state.${menu.id}.}}`, 2)}
          >
            {t("fields.dynamicValue.customPath")}
          </button>
        </div>
      )}
    </div>
  );
}

export interface DynamicValueFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  error?: string;
  hint?: string;
}

/**
 * Labeled form field accepting a literal value or a `{{path}}` dynamic
 * template (see {@link DynamicValueInput}). Drop-in replacement for
 * TextField wherever a node property should support dynamic values —
 * available to custom node details as well.
 */
export function DynamicValueField({
  label,
  value,
  onChange,
  placeholder,
  disabled,
  error,
  hint,
}: DynamicValueFieldProps) {
  return (
    <Field label={label} error={error} hint={hint}>
      <DynamicValueInput
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        error={Boolean(error)}
      />
    </Field>
  );
}
