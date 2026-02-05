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
  gap: "var(--of-spacing-1, 4px)",
  marginBottom: "var(--of-spacing-5, 12px)",
};

const labelStyle: React.CSSProperties = {
  fontSize: "var(--of-field-label-size, 12px)",
  fontWeight: "var(--of-font-weight-medium, 500)" as React.CSSProperties["fontWeight"],
  color: "var(--of-field-label-color, #374151)",
};

const errorStyle: React.CSSProperties = {
  fontSize: "var(--of-font-size-xs, 11px)",
  color: "var(--of-field-error-color, #DC2626)",
};

const hintStyle: React.CSSProperties = {
  fontSize: "var(--of-font-size-xs, 11px)",
  color: "var(--of-field-hint-color, #6B7280)",
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
