import React from "react";

export interface FieldProps {
  label: string;
  children: React.ReactNode;
  error?: string;
  hint?: string;
}

const fieldStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "4px",
  marginBottom: "12px",
};

const labelStyle: React.CSSProperties = {
  fontSize: "12px",
  fontWeight: 500,
  color: "#374151",
};

const errorStyle: React.CSSProperties = {
  fontSize: "11px",
  color: "#DC2626",
};

const hintStyle: React.CSSProperties = {
  fontSize: "11px",
  color: "#6B7280",
};

/**
 * Base field wrapper component that provides label, error, and hint display.
 * Use this to wrap custom inputs.
 */
export function Field({ label, children, error, hint }: FieldProps) {
  return (
    <div style={fieldStyle}>
      <label style={labelStyle}>{label}</label>
      {children}
      {error && <span style={errorStyle}>{error}</span>}
      {hint && !error && <span style={hintStyle}>{hint}</span>}
    </div>
  );
}
