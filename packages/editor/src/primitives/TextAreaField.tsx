import React from "react";
import { Field } from "./Field";

export interface TextAreaFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  rows?: number;
  placeholder?: string;
  disabled?: boolean;
  error?: string;
  hint?: string;
}

const textareaStyle: React.CSSProperties = {
  padding: "8px 10px",
  borderRadius: "6px",
  border: "1px solid #D1D5DB",
  fontSize: "13px",
  outline: "none",
  transition: "border-color 0.15s",
  resize: "vertical",
  fontFamily: "inherit",
};

/**
 * Multi-line text input field with label.
 */
export function TextAreaField({
  label,
  value,
  onChange,
  rows = 4,
  placeholder,
  disabled,
  error,
  hint,
}: TextAreaFieldProps) {
  return (
    <Field label={label} error={error} hint={hint}>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        placeholder={placeholder}
        disabled={disabled}
        style={{
          ...textareaStyle,
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
