import React from "react";
import { useNodeRegistry } from "../hooks/useNodeRegistry";
import { useDragAndDrop } from "../hooks/useDragAndDrop";
import { useTranslation } from "../i18n";
import type { NodesPanelProps, NodeTypeDefinition } from "../context/types";

const panelStyle: React.CSSProperties = {
  backgroundColor: "var(--of-panel-bg, #fff)",
  borderRadius: "var(--of-panel-radius, 8px)",
  padding: "var(--of-panel-padding, 12px)",
  boxShadow: "var(--of-panel-shadow, 0 2px 8px rgba(0,0,0,0.1))",
  minWidth: "180px",
};

const titleStyle: React.CSSProperties = {
  fontSize: "var(--of-panel-title-size, 12px)",
  fontWeight: "var(--of-font-weight-semibold, 600)" as React.CSSProperties["fontWeight"],
  color: "var(--of-panel-title-color, #374151)",
  marginBottom: "var(--of-spacing-5, 12px)",
  textTransform: "uppercase",
  letterSpacing: "0.5px",
};

const itemStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "var(--of-spacing-3, 8px)",
  padding: "var(--of-spacing-3, 8px) var(--of-spacing-4, 10px)",
  borderRadius: "var(--of-radius-md, 6px)",
  cursor: "grab",
  marginBottom: "var(--of-spacing-1, 4px)",
  border: "1px solid var(--of-color-border-secondary, #E5E7EB)",
  backgroundColor: "var(--of-color-bg-primary, #fff)",
  transition: "all var(--of-transition-fast, 0.15s)",
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
  fontSize: "var(--of-field-font-size, 13px)",
  fontWeight: "var(--of-font-weight-medium, 500)" as React.CSSProperties["fontWeight"],
  color: "var(--of-color-text-primary, #111827)",
};

const itemDescStyle: React.CSSProperties = {
  fontSize: "var(--of-font-size-xs, 11px)",
  color: "var(--of-color-text-tertiary, #6B7280)",
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
  const t = useTranslation();
  const IconComponent = nodeType.Icon;

  // Resolve a translation key when present, falling back to the raw string when
  // the key is unset or has no registered translation (custom nodes may not
  // provide `labelKey`/`descriptionKey`, and `t` returns the key when unmatched).
  const resolve = (key: string | undefined, fallback: string | undefined) => {
    if (!key) return fallback;
    const translated = t(key);
    return translated === key ? fallback : translated;
  };
  const label = resolve(nodeType.labelKey, nodeType.label);
  const description = resolve(nodeType.descriptionKey, nodeType.description);

  return (
    <div
      style={itemStyle}
      draggable
      onDragStart={(e) => onDragStart(e, nodeType.type)}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor =
          "var(--of-color-border-focus, #3B82F6)";
        (e.currentTarget as HTMLElement).style.backgroundColor =
          "var(--of-color-bg-secondary, #F9FAFB)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor =
          "var(--of-color-border-secondary, #E5E7EB)";
        (e.currentTarget as HTMLElement).style.backgroundColor =
          "var(--of-color-bg-primary, #fff)";
      }}
    >
      <div style={itemIconStyle}>
        {IconComponent ? <IconComponent size={24} /> : null}
      </div>
      <div style={itemTextStyle}>
        <div style={itemLabelStyle}>{label}</div>
        {showDescription && description && (
          <div style={itemDescStyle}>{description}</div>
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
  const t = useTranslation();

  const filteredNodeTypes = filter
    ? nodeTypesList.filter(filter)
    : nodeTypesList;

  return (
    <div style={panelStyle} className={className}>
      <div style={titleStyle}>{t("panels.nodes.title")}</div>
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
