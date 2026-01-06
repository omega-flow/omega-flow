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
  padding: "8px 10px",
  borderRadius: "6px",
  border: "1px solid #D1D5DB",
  fontSize: "13px",
  outline: "none",
  transition: "border-color 0.15s",
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
          borderColor: error ? "#DC2626" : "#D1D5DB",
          backgroundColor: disabled ? "#F3F4F6" : "#fff",
        }}
        onFocus={(e) => {
          if (!error) e.target.style.borderColor = "#3B82F6";
        }}
        onBlur={(e) => {
          if (!error) e.target.style.borderColor = "#D1D5DB";
        }}
      />
    </Field>
  );
}
