import React from "react";
import { useSelectedNode } from "../hooks/useSelectedNode";
import type { DetailPanelProps } from "../context/types";

const panelStyle: React.CSSProperties = {
  backgroundColor: "#fff",
  borderRadius: "8px",
  padding: "12px",
  boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
  minWidth: "280px",
  maxWidth: "320px",
};

const titleStyle: React.CSSProperties = {
  fontSize: "12px",
  fontWeight: 600,
  color: "#374151",
  marginBottom: "12px",
  textTransform: "uppercase",
  letterSpacing: "0.5px",
};

const emptyStyle: React.CSSProperties = {
  fontSize: "13px",
  color: "#6B7280",
  textAlign: "center",
  padding: "20px 0",
};

const headerStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "8px",
  marginBottom: "16px",
  paddingBottom: "12px",
  borderBottom: "1px solid #E5E7EB",
};

const nodeTypeStyle: React.CSSProperties = {
  fontSize: "14px",
  fontWeight: 600,
  color: "#111827",
};

const nodeIdStyle: React.CSSProperties = {
  fontSize: "11px",
  color: "#9CA3AF",
  fontFamily: "monospace",
};

const deleteButtonStyle: React.CSSProperties = {
  marginLeft: "auto",
  padding: "4px 8px",
  fontSize: "11px",
  color: "#DC2626",
  backgroundColor: "#FEE2E2",
  border: "none",
  borderRadius: "4px",
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
