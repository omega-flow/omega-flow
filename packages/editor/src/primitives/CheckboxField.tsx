import React from "react";

export interface CheckboxFieldProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}

const containerStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "8px",
  marginBottom: "12px",
  cursor: "pointer",
};

const checkboxStyle: React.CSSProperties = {
  width: "16px",
  height: "16px",
  cursor: "pointer",
};

const labelStyle: React.CSSProperties = {
  fontSize: "13px",
  color: "#374151",
  cursor: "pointer",
};

/**
 * Checkbox field with label.
 */
export function CheckboxField({
  label,
  checked,
  onChange,
  disabled,
}: CheckboxFieldProps) {
  return (
    <label
      style={{
        ...containerStyle,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.6 : 1,
      }}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
        style={checkboxStyle}
      />
      <span style={labelStyle}>{label}</span>
    </label>
  );
}
