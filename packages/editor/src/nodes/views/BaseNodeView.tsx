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
  padding: "10px 15px",
  borderRadius: "8px",
  border: "2px solid",
  backgroundColor: "#fff",
  minWidth: "150px",
  fontSize: "12px",
  fontFamily: "system-ui, sans-serif",
};

const headerStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "6px",
  fontWeight: 600,
  marginBottom: "4px",
};

const contentStyle: React.CSSProperties = {
  color: "#666",
  fontSize: "11px",
};

const handleStyle: React.CSSProperties = {
  width: "10px",
  height: "10px",
  borderRadius: "50%",
};

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
        boxShadow: selected ? `0 0 0 2px ${color}40` : "0 2px 4px rgba(0,0,0,0.1)",
      }}
    >
      {/* Target handles (inputs) */}
      {targetHandles.map((handle, index) => (
        <Handle
          key={handle.id}
          type="target"
          position={Position.Top}
          id={handle.id}
          style={{
            ...handleStyle,
            backgroundColor: color,
            left: `${((index + 1) / (targetHandles.length + 1)) * 100}%`,
          }}
        />
      ))}

      {/* Header */}
      <div style={headerStyle}>
        {icon && <span style={{ color }}>{icon}</span>}
        <span>{label}</span>
      </div>

      {/* Content */}
      {children && <div style={contentStyle}>{children}</div>}

      {/* Source handles (outputs) */}
      {sourceHandles.map((handle, index) => (
        <Handle
          key={handle.id}
          type="source"
          position={Position.Bottom}
          id={handle.id}
          style={{
            ...handleStyle,
            backgroundColor: color,
            left: `${((index + 1) / (sourceHandles.length + 1)) * 100}%`,
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
