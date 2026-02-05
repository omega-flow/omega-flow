import React from "react";
import { Field } from "./Field";

export interface TextFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  error?: string;
  hint?: string;
}

const inputStyle: React.CSSProperties = {
  padding: "var(--of-field-padding, 8px 10px)",
  borderRadius: "var(--of-field-radius, 6px)",
  border: "1px solid var(--of-field-border, #D1D5DB)",
  fontSize: "var(--of-field-font-size, 13px)",
  outline: "none",
  transition: "border-color var(--of-transition-fast, 0.15s)",
  color: "var(--of-color-text-primary, #111827)",
};

/**
 * Text input field with label.
 */
export function TextField({
  label,
  value,
  onChange,
  placeholder,
  disabled,
  error,
  hint,
}: TextFieldProps) {
  return (
    <Field label={label} error={error} hint={hint}>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        style={{
          ...inputStyle,
          borderColor: error
            ? "var(--of-field-border-error, #DC2626)"
            : "var(--of-field-border, #D1D5DB)",
          backgroundColor: disabled
            ? "var(--of-color-bg-disabled, #F3F4F6)"
            : "var(--of-field-bg, #fff)",
        }}
        onFocus={(e) => {
          if (!error)
            e.target.style.borderColor = "var(--of-field-border-focus, #3B82F6)";
        }}
        onBlur={(e) => {
          if (!error)
            e.target.style.borderColor = "var(--of-field-border, #D1D5DB)";
        }}
      />
    </Field>
  );
}
