import React from "react";
import { useNodeRegistry } from "../hooks/useNodeRegistry";
import { useDragAndDrop } from "../hooks/useDragAndDrop";
import type { NodesPanelProps, NodeTypeDefinition } from "../context/types";

const panelStyle: React.CSSProperties = {
  backgroundColor: "#fff",
  borderRadius: "8px",
  padding: "12px",
  boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
  minWidth: "180px",
};

const titleStyle: React.CSSProperties = {
  fontSize: "12px",
  fontWeight: 600,
  color: "#374151",
  marginBottom: "12px",
  textTransform: "uppercase",
  letterSpacing: "0.5px",
};

const itemStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "8px",
  padding: "8px 10px",
  borderRadius: "6px",
  cursor: "grab",
  marginBottom: "4px",
  border: "1px solid #E5E7EB",
  backgroundColor: "#fff",
  transition: "all 0.15s",
};

const itemIconStyle: React.CSSProperties = {
  width: "24px",
  height: "24px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
};

const itemTextStyle: React.CSSProperties = {
  flex: 1,
};

const itemLabelStyle: React.CSSProperties = {
  fontSize: "13px",
  fontWeight: 500,
  color: "#111827",
};

const itemDescStyle: React.CSSProperties = {
  fontSize: "11px",
  color: "#6B7280",
  marginTop: "2px",
};

function NodeItem({
  nodeType,
  onDragStart,
  showDescription = true,
}: {
  nodeType: NodeTypeDefinition;
  onDragStart: (e: React.DragEvent, type: string) => void;
  showDescription?: boolean;
}) {
  const IconComponent = nodeType.Icon;

  return (
    <div
      style={itemStyle}
      draggable
      onDragStart={(e) => onDragStart(e, nodeType.type)}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor = "#3B82F6";
        (e.currentTarget as HTMLElement).style.backgroundColor = "#F9FAFB";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor = "#E5E7EB";
        (e.currentTarget as HTMLElement).style.backgroundColor = "#fff";
      }}
    >
      <div style={itemIconStyle}>
        {IconComponent ? <IconComponent size={24} /> : null}
      </div>
      <div style={itemTextStyle}>
        <div style={itemLabelStyle}>{nodeType.label}</div>
        {showDescription && nodeType.description && (
          <div style={itemDescStyle}>{nodeType.description}</div>
        )}
      </div>
    </div>
  );
}

/**
 * Panel showing available node types that can be dragged onto the canvas.
 */
export function NodesPanel({
  className,
  showDescriptions = true,
  filter,
  renderItem,
}: NodesPanelProps) {
  const { nodeTypesList } = useNodeRegistry();
  const { onDragStart } = useDragAndDrop();

  const filteredNodeTypes = filter
    ? nodeTypesList.filter(filter)
    : nodeTypesList;

  return (
    <div style={panelStyle} className={className}>
      <div style={titleStyle}>Nodes</div>
      {filteredNodeTypes.map((nodeType) =>
        renderItem ? (
          <div
            key={nodeType.type}
            draggable
            onDragStart={(e) => onDragStart(e, nodeType.type)}
          >
            {renderItem(nodeType)}
          </div>
        ) : (
          <NodeItem
            key={nodeType.type}
            nodeType={nodeType}
            onDragStart={onDragStart}
            showDescription={showDescriptions}
          />
        )
      )}
    </div>
  );
}
