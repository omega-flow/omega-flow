import React, { useEffect, useState } from "react";
import { useSelectedNode } from "../hooks/useSelectedNode";
import { useTranslation } from "../i18n";
import { getNodeName } from "../utils/nodeName";
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

const nameRowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "var(--of-spacing-2, 6px)",
  minWidth: 0,
};

const nodeNameStyle: React.CSSProperties = {
  fontSize: "var(--of-font-size-lg, 14px)",
  fontWeight: "var(--of-font-weight-semibold, 600)" as React.CSSProperties["fontWeight"],
  color: "var(--of-color-text-primary, #111827)",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

const nameInputStyle: React.CSSProperties = {
  fontSize: "var(--of-font-size-lg, 14px)",
  fontWeight: "var(--of-font-weight-semibold, 600)" as React.CSSProperties["fontWeight"],
  color: "var(--of-color-text-primary, #111827)",
  backgroundColor: "var(--of-field-bg, #fff)",
  border: "1px solid var(--of-field-border-focus, #3B82F6)",
  borderRadius: "var(--of-radius-sm, 4px)",
  padding: "1px var(--of-spacing-1, 4px)",
  outline: "none",
  minWidth: 0,
  width: "100%",
};

const pencilButtonStyle: React.CSSProperties = {
  border: "none",
  background: "none",
  padding: "0 2px",
  cursor: "pointer",
  fontSize: "var(--of-font-size-sm, 12px)",
  color: "var(--of-color-text-muted, #9CA3AF)",
  lineHeight: 1,
  flexShrink: 0,
};

const nodeTypeStyle: React.CSSProperties = {
  fontSize: "var(--of-font-size-xs, 11px)",
  color: "var(--of-color-text-tertiary, #6B7280)",
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
 *
 * The header shows the node's display name (`data.name`, falling back to the
 * type label) with inline renaming: a pencil appears on hover, click to
 * edit, Enter/blur commits, Escape cancels. Names are display-only — dynamic
 * value references always use the node id, so renaming is always safe.
 *
 * Renders the appropriate DetailComponent based on node type.
 */
export function DetailPanel({
  className,
  emptyMessage,
  showNodeType = true,
  showNodeId = false,
}: DetailPanelProps) {
  const { selectedNode, nodeType, updateSelectedNode, removeSelectedNode } =
    useSelectedNode();
  const t = useTranslation();
  // null = not editing; string = in-progress edit value
  const [editingName, setEditingName] = useState<string | null>(null);
  const [headerHovered, setHeaderHovered] = useState(false);

  // Abandon an in-progress edit when the selection changes
  const selectedNodeId = selectedNode?.id;
  useEffect(() => {
    setEditingName(null);
  }, [selectedNodeId]);

  if (!selectedNode || !nodeType) {
    return (
      <div style={panelStyle} className={className}>
        <div style={titleStyle}>{t("panels.detail.title")}</div>
        <div style={emptyStyle}>{emptyMessage ?? t("panels.detail.emptyMessage")}</div>
      </div>
    );
  }

  const DetailComponent = nodeType.DetailComponent;
  const displayName =
    typeof selectedNode.data?.name === "string" &&
    selectedNode.data.name.trim() !== ""
      ? selectedNode.data.name.trim()
      : nodeType.label;

  const commitName = () => {
    if (editingName !== null) {
      updateSelectedNode({ name: editingName.trim() });
      setEditingName(null);
    }
  };

  return (
    <div style={panelStyle} className={className}>
      <div style={titleStyle}>{t("panels.detail.title")}</div>

      <div
        style={headerStyle}
        onMouseEnter={() => setHeaderHovered(true)}
        onMouseLeave={() => setHeaderHovered(false)}
      >
        <div style={{ minWidth: 0, flex: 1 }}>
          {editingName !== null ? (
            <input
              type="text"
              autoFocus
              value={editingName}
              placeholder={nodeType.label}
              onChange={(e) => setEditingName(e.target.value)}
              onBlur={commitName}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitName();
                if (e.key === "Escape") setEditingName(null);
              }}
              style={nameInputStyle}
            />
          ) : (
            <div style={nameRowStyle}>
              <span style={nodeNameStyle}>{displayName}</span>
              <button
                type="button"
                title={t("panels.detail.renameTitle")}
                onClick={() => setEditingName(getNodeName(selectedNode))}
                style={{
                  ...pencilButtonStyle,
                  visibility: headerHovered ? "visible" : "hidden",
                }}
              >
                ✎
              </button>
            </div>
          )}
          {showNodeType && <div style={nodeTypeStyle}>{nodeType.label}</div>}
          {showNodeId && <div style={nodeIdStyle}>{selectedNode.id}</div>}
        </div>
        <button
          style={deleteButtonStyle}
          onClick={removeSelectedNode}
          title={t("panels.detail.deleteTitle")}
        >
          {t("panels.detail.delete")}
        </button>
      </div>

      <DetailComponent
        node={selectedNode}
        onChange={(data) => updateSelectedNode(data)}
      />
    </div>
  );
}
