import React from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { HandleDefinition } from "../types";

export interface BaseNodeViewProps {
  id: string;
  data: Record<string, unknown>;
  selected?: boolean;
  label: string;
  color?: string;
  icon?: React.ReactNode;
  sourceHandles?: HandleDefinition[];
  targetHandles?: HandleDefinition[];
  children?: React.ReactNode;
}

const baseStyle: React.CSSProperties = {
  padding: "var(--of-spacing-4, 10px) 15px",
  borderRadius: "var(--of-radius-lg, 8px)",
  border: "2px solid",
  backgroundColor: "var(--of-node-bg, #fff)",
  minWidth: "150px",
  fontSize: "var(--of-font-size-sm, 12px)",
  fontFamily: "var(--of-font-family-base, system-ui, sans-serif)",
  position: "relative",
};

const headerStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "var(--of-spacing-2, 6px)",
  fontWeight: "var(--of-font-weight-semibold, 600)" as React.CSSProperties["fontWeight"],
  marginBottom: "var(--of-spacing-1, 4px)",
  color: "var(--of-color-text-primary, #111827)",
};

const contentStyle: React.CSSProperties = {
  color: "var(--of-node-content-color, #666)",
  fontSize: "var(--of-font-size-xs, 11px)",
};

const handleStyle: React.CSSProperties = {
  width: "var(--of-handle-size, 10px)",
  height: "var(--of-handle-size, 10px)",
  borderRadius: "50%",
};

const handleLabelRowStyle: React.CSSProperties = {
  position: "relative",
  height: "var(--of-handle-label-size, 10px)",
  lineHeight: "var(--of-handle-label-size, 10px)",
};

const handleLabelStyle: React.CSSProperties = {
  position: "absolute",
  transform: "translateX(-50%)",
  fontSize: "var(--of-handle-label-size, 10px)",
  fontWeight: "var(--of-font-weight-medium, 500)" as React.CSSProperties["fontWeight"],
  letterSpacing: "0.02em",
  whiteSpace: "nowrap",
  pointerEvents: "none",
};

/** Handles are spread evenly across the edge they sit on. */
function handleOffset(index: number, total: number): string {
  return `${((index + 1) / (total + 1)) * 100}%`;
}

/**
 * Labels for a set of handles, laid out at the same offsets as the handles
 * themselves so each name sits directly above/below its connection point.
 * Rendered only for multi-handle edges, where the position alone would not
 * tell the user which branch a handle belongs to.
 */
function HandleLabels({
  handles,
  color,
  placement,
}: {
  handles: HandleDefinition[];
  color: string;
  placement: "top" | "bottom";
}) {
  if (handles.length < 2 || !handles.some((handle) => handle.label)) return null;

  return (
    <div
      style={{
        ...handleLabelRowStyle,
        [placement === "top" ? "marginBottom" : "marginTop"]: "var(--of-spacing-1, 4px)",
      }}
      aria-hidden="true"
    >
      {handles.map((handle, index) => (
        <span
          key={handle.id}
          style={{
            ...handleLabelStyle,
            left: handleOffset(index, handles.length),
            color: handle.color ?? color,
          }}
        >
          {handle.label}
        </span>
      ))}
    </div>
  );
}

/**
 * Base component for rendering nodes on the canvas.
 * Provides consistent styling and handle rendering.
 */
export function BaseNodeView({
  label,
  color = "#666",
  icon,
  sourceHandles = [],
  targetHandles = [],
  selected,
  children,
}: BaseNodeViewProps) {
  return (
    <div
      style={{
        ...baseStyle,
        borderColor: color,
        boxShadow: selected
          ? `0 0 0 2px ${color}40`
          : "var(--of-node-shadow, 0 2px 4px rgba(0,0,0,0.1))",
      }}
    >
      {/* Target handles (inputs) */}
      {targetHandles.map((handle, index) => (
        <Handle
          key={handle.id}
          type="target"
          position={Position.Top}
          id={handle.id}
          title={handle.label}
          aria-label={handle.label}
          style={{
            ...handleStyle,
            backgroundColor: handle.color ?? color,
            left: handleOffset(index, targetHandles.length),
          }}
        />
      ))}

      <HandleLabels handles={targetHandles} color={color} placement="top" />

      {/* Header */}
      <div style={headerStyle}>
        {icon && <span style={{ color }}>{icon}</span>}
        <span>{label}</span>
      </div>

      {/* Content */}
      {children && <div style={contentStyle}>{children}</div>}

      {/* Source handles (outputs) */}
      <HandleLabels handles={sourceHandles} color={color} placement="bottom" />

      {sourceHandles.map((handle, index) => (
        <Handle
          key={handle.id}
          type="source"
          position={Position.Bottom}
          id={handle.id}
          title={handle.label}
          aria-label={handle.label}
          style={{
            ...handleStyle,
            backgroundColor: handle.color ?? color,
            left: handleOffset(index, sourceHandles.length),
          }}
        />
      ))}
    </div>
  );
}

/**
 * Creates a ReactFlow-compatible node component from BaseNodeView configuration
 */
export function createNodeView(config: {
  label: string;
  color: string;
  icon: string;
  sourceHandles: HandleDefinition[];
  targetHandles: HandleDefinition[];
  renderContent: (data: Record<string, unknown>) => React.ReactNode;
}): React.ComponentType<NodeProps> {
  return function NodeView({ id, data, selected }: NodeProps) {
    return (
      <BaseNodeView
        id={id}
        data={data as Record<string, unknown>}
        selected={selected}
        label={config.label}
        color={config.color}
        icon={config.icon}
        sourceHandles={config.sourceHandles}
        targetHandles={config.targetHandles}
      >
        {config.renderContent(data as Record<string, unknown>)}
      </BaseNodeView>
    );
  };
}
