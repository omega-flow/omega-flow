import React from "react";
import { Field } from "./Field";

export interface NumberFieldProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
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
 * Number input field with label.
 */
export function NumberField({
  label,
  value,
  onChange,
  min,
  max,
  step,
  disabled,
  error,
  hint,
}: NumberFieldProps) {
  return (
    <Field label={label} error={error} hint={hint}>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        min={min}
        max={max}
        step={step}
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
