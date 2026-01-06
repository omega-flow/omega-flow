import React, { useState } from "react";

export interface FieldGroupProps {
  label?: string;
  children: React.ReactNode;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
}

const groupStyle: React.CSSProperties = {
  marginBottom: "16px",
};

const headerStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "6px",
  marginBottom: "12px",
  fontSize: "13px",
  fontWeight: 600,
  color: "#111827",
};

const toggleStyle: React.CSSProperties = {
  cursor: "pointer",
  userSelect: "none",
  display: "flex",
  alignItems: "center",
  gap: "6px",
};

const contentStyle: React.CSSProperties = {
  paddingLeft: "4px",
};

/**
 * Groups related fields together with an optional label.
 * Can be made collapsible for better organization.
 */
export function FieldGroup({
  label,
  children,
  collapsible = false,
  defaultCollapsed = false,
}: FieldGroupProps) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);

  if (!label) {
    return <div style={groupStyle}>{children}</div>;
  }

  if (collapsible) {
    return (
      <div style={groupStyle}>
        <div
          style={{ ...headerStyle, ...toggleStyle }}
          onClick={() => setCollapsed(!collapsed)}
        >
          <span style={{ transform: collapsed ? "rotate(-90deg)" : "rotate(0)", transition: "transform 0.15s" }}>
            ▼
          </span>
          {label}
        </div>
        {!collapsed && <div style={contentStyle}>{children}</div>}
      </div>
    );
  }

  return (
    <div style={groupStyle}>
      <div style={headerStyle}>{label}</div>
      <div style={contentStyle}>{children}</div>
    </div>
  );
}
