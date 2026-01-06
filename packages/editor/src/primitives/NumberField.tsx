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
  padding: "8px 10px",
  borderRadius: "6px",
  border: "1px solid #D1D5DB",
  fontSize: "13px",
  outline: "none",
  transition: "border-color 0.15s",
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
