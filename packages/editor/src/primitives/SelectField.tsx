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
  padding: "8px 10px",
  borderRadius: "6px",
  border: "1px solid #D1D5DB",
  fontSize: "13px",
  outline: "none",
  transition: "border-color 0.15s",
  backgroundColor: "#fff",
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
          borderColor: error ? "#DC2626" : "#D1D5DB",
          backgroundColor: disabled ? "#F3F4F6" : "#fff",
        }}
        onFocus={(e) => {
          if (!error) e.target.style.borderColor = "#3B82F6";
        }}
        onBlur={(e) => {
          if (!error) e.target.style.borderColor = "#D1D5DB";
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
