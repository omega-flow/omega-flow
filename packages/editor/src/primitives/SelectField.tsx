import React from "react";
import { Field } from "./Field";

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectFieldProps {
  label: string;
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  error?: string;
  hint?: string;
}

const selectStyle: React.CSSProperties = {
  padding: "var(--of-field-padding, 8px 10px)",
  borderRadius: "var(--of-field-radius, 6px)",
  border: "1px solid var(--of-field-border, #D1D5DB)",
  fontSize: "var(--of-field-font-size, 13px)",
  outline: "none",
  transition: "border-color var(--of-transition-fast, 0.15s)",
  backgroundColor: "var(--of-field-bg, #fff)",
  color: "var(--of-color-text-primary, #111827)",
  cursor: "pointer",
};

/**
 * Select dropdown field with label.
 */
export function SelectField({
  label,
  value,
  options,
  onChange,
  placeholder,
  disabled,
  error,
  hint,
}: SelectFieldProps) {
  return (
    <Field label={label} error={error} hint={hint}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        style={{
          ...selectStyle,
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
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </Field>
  );
}
