import React from "react";
import { Panel } from "@xyflow/react";
import { useWorkflowEditorContext } from "../context/WorkflowEditorContext";
import { useTranslation } from "../i18n";
import type { NodeTypeDefinition, PendingInsertion } from "../context/types";

export interface NodeChooserProps {
  className?: string;
  /** Additional filter on the offered node types */
  filter?: (nodeType: NodeTypeDefinition) => boolean;
  /** Custom render function for items */
  renderItem?: (nodeType: NodeTypeDefinition) => React.ReactNode;
}

const panelStyle: React.CSSProperties = {
  backgroundColor: "var(--of-panel-bg, #fff)",
  borderRadius: "var(--of-panel-radius, 8px)",
  padding: "var(--of-panel-padding, 12px)",
  boxShadow: "var(--of-panel-shadow, 0 2px 8px rgba(0,0,0,0.1))",
  minWidth: "220px",
  maxHeight: "60vh",
  overflowY: "auto",
  fontFamily: "var(--of-font-family-base, system-ui, sans-serif)",
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
  cursor: "pointer",
  marginBottom: "var(--of-spacing-1, 4px)",
  border: "1px solid var(--of-color-border-secondary, #E5E7EB)",
  backgroundColor: "var(--of-color-bg-primary, #fff)",
  transition: "all var(--of-transition-fast, 0.15s)",
  width: "100%",
  textAlign: "left",
  font: "inherit",
};

const itemIconStyle: React.CSSProperties = {
  width: "24px",
  height: "24px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
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

const cancelStyle: React.CSSProperties = {
  marginTop: "var(--of-spacing-3, 8px)",
  padding: "var(--of-spacing-2, 6px) var(--of-spacing-4, 10px)",
  borderRadius: "var(--of-button-radius, 6px)",
  border: "1px solid var(--of-color-border-secondary, #E5E7EB)",
  backgroundColor: "transparent",
  color: "var(--of-color-text-secondary, #374151)",
  fontSize: "var(--of-font-size-sm, 12px)",
  font: "inherit",
  cursor: "pointer",
  width: "100%",
};

const emptyStyle: React.CSSProperties = {
  fontSize: "var(--of-font-size-sm, 12px)",
  color: "var(--of-color-text-tertiary, #6B7280)",
};

function isEligible(
  definition: NodeTypeDefinition,
  insertion: PendingInsertion
): boolean {
  const role = definition.role ?? "flow";
  if (insertion.kind === "root") return role === "trigger";
  if (role === "trigger") return false;
  // A terminal node has no outputs, so it cannot sit in the middle of an edge
  if (insertion.kind === "edge") return role !== "terminal";
  return true;
}

/**
 * Popover listing the node types that can be inserted at the pending
 * insertion point. Renders nothing while no insertion is pending. Place it
 * inside `<ReactFlow>` (it uses a ReactFlow `Panel`).
 */
export function NodeChooser({ className, filter, renderItem }: NodeChooserProps) {
  const t = useTranslation();
  const {
    pendingInsertion,
    nodeTypes,
    requestInsertion,
    insertNodeAfter,
    insertNodeOnEdge,
    addNode,
  } = useWorkflowEditorContext();

  if (!pendingInsertion) return null;

  const eligible = Array.from(nodeTypes.values()).filter(
    (definition) =>
      isEligible(definition, pendingInsertion) &&
      (filter ? filter(definition) : true)
  );

  const choose = (type: string) => {
    if (pendingInsertion.kind === "after") {
      insertNodeAfter(
        pendingInsertion.sourceNodeId,
        pendingInsertion.sourceHandleId,
        type
      );
    } else if (pendingInsertion.kind === "edge") {
      insertNodeOnEdge(pendingInsertion.edgeId, type);
    } else {
      addNode(type, { x: 0, y: 0 });
    }
  };

  const resolve = (key: string | undefined, fallback: string | undefined) => {
    if (!key) return fallback;
    const translated = t(key);
    return translated === key ? fallback : translated;
  };

  return (
    <Panel position="top-center" className={className}>
      <div style={panelStyle} role="dialog" aria-modal="false">
        <div style={titleStyle}>
          {pendingInsertion.kind === "root"
            ? t("guided.chooser.triggerTitle")
            : t("guided.chooser.title")}
        </div>
        {eligible.length === 0 && (
          <div style={emptyStyle}>{t("guided.chooser.empty")}</div>
        )}
        {eligible.map((definition) => {
          if (renderItem) {
            return (
              <div key={definition.type} onClick={() => choose(definition.type)}>
                {renderItem(definition)}
              </div>
            );
          }
          const IconComponent = definition.Icon;
          return (
            <button
              key={definition.type}
              type="button"
              style={itemStyle}
              onClick={() => choose(definition.type)}
            >
              {IconComponent && (
                <span style={itemIconStyle}>
                  <IconComponent size={18} />
                </span>
              )}
              <span>
                <span style={{ ...itemLabelStyle, display: "block" }}>
                  {resolve(definition.labelKey, definition.label)}
                </span>
                {definition.description && (
                  <span style={{ ...itemDescStyle, display: "block" }}>
                    {resolve(definition.descriptionKey, definition.description)}
                  </span>
                )}
              </span>
            </button>
          );
        })}
        <button
          type="button"
          style={cancelStyle}
          onClick={() => requestInsertion(null)}
        >
          {t("guided.chooser.cancel")}
        </button>
      </div>
    </Panel>
  );
}
