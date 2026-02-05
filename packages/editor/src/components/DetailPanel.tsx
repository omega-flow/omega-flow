import React from "react";
import { useSelectedNode } from "../hooks/useSelectedNode";
import type { DetailPanelProps } from "../context/types";

const panelStyle: React.CSSProperties = {
  backgroundColor: "var(--of-panel-bg, #fff)",
  borderRadius: "var(--of-panel-radius, 8px)",
  padding: "var(--of-panel-padding, 12px)",
  boxShadow: "var(--of-panel-shadow, 0 2px 8px rgba(0,0,0,0.1))",
  minWidth: "280px",
  maxWidth: "320px",
};

const titleStyle: React.CSSProperties = {
  fontSize: "var(--of-panel-title-size, 12px)",
  fontWeight: "var(--of-font-weight-semibold, 600)" as React.CSSProperties["fontWeight"],
  color: "var(--of-panel-title-color, #374151)",
  marginBottom: "var(--of-spacing-5, 12px)",
  textTransform: "uppercase",
  letterSpacing: "0.5px",
};

const emptyStyle: React.CSSProperties = {
  fontSize: "var(--of-field-font-size, 13px)",
  color: "var(--of-color-text-tertiary, #6B7280)",
  textAlign: "center",
  padding: "var(--of-spacing-7, 20px) 0",
};

const headerStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "var(--of-spacing-3, 8px)",
  marginBottom: "var(--of-spacing-6, 16px)",
  paddingBottom: "var(--of-spacing-5, 12px)",
  borderBottom: "1px solid var(--of-color-border-secondary, #E5E7EB)",
};

const nodeTypeStyle: React.CSSProperties = {
  fontSize: "var(--of-font-size-lg, 14px)",
  fontWeight: "var(--of-font-weight-semibold, 600)" as React.CSSProperties["fontWeight"],
  color: "var(--of-color-text-primary, #111827)",
};

const nodeIdStyle: React.CSSProperties = {
  fontSize: "var(--of-font-size-xs, 11px)",
  color: "var(--of-color-text-muted, #9CA3AF)",
  fontFamily: "var(--of-font-family-mono, monospace)",
};

const deleteButtonStyle: React.CSSProperties = {
  marginLeft: "auto",
  padding: "var(--of-spacing-1, 4px) var(--of-spacing-3, 8px)",
  fontSize: "var(--of-font-size-xs, 11px)",
  color: "var(--of-button-danger-color, #DC2626)",
  backgroundColor: "var(--of-button-danger-bg, #FEE2E2)",
  border: "none",
  borderRadius: "var(--of-radius-sm, 4px)",
  cursor: "pointer",
};

/**
 * Panel for editing the properties of the selected node.
 * Renders the appropriate DetailComponent based on node type.
 */
export function DetailPanel({
  className,
  emptyMessage = "Select a node to edit its properties",
  showNodeType = true,
  showNodeId = false,
}: DetailPanelProps) {
  const { selectedNode, nodeType, updateSelectedNode, removeSelectedNode } =
    useSelectedNode();

  if (!selectedNode || !nodeType) {
    return (
      <div style={panelStyle} className={className}>
        <div style={titleStyle}>Properties</div>
        <div style={emptyStyle}>{emptyMessage}</div>
      </div>
    );
  }

  const DetailComponent = nodeType.DetailComponent;

  return (
    <div style={panelStyle} className={className}>
      <div style={titleStyle}>Properties</div>

      <div style={headerStyle}>
        <div>
          {showNodeType && <div style={nodeTypeStyle}>{nodeType.label}</div>}
          {showNodeId && <div style={nodeIdStyle}>{selectedNode.id}</div>}
        </div>
        <button
          style={deleteButtonStyle}
          onClick={removeSelectedNode}
          title="Delete node"
        >
          Delete
        </button>
      </div>

      <DetailComponent
        node={selectedNode}
        onChange={(data) => updateSelectedNode(data)}
      />
    </div>
  );
}
