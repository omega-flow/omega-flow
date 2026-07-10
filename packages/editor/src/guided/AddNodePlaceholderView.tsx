import React, { useState } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { useWorkflowEditorContext } from "../context/WorkflowEditorContext";
import { useTranslation } from "../i18n";
import type { PendingInsertion } from "../context/types";
import { PLACEHOLDER_WIDTH, PLACEHOLDER_HEIGHT } from "./constants";

const baseStyle: React.CSSProperties = {
  width: `${PLACEHOLDER_WIDTH}px`,
  height: `${PLACEHOLDER_HEIGHT}px`,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "var(--of-spacing-2, 6px)",
  borderRadius: "var(--of-radius-lg, 8px)",
  border: "2px dashed var(--of-guided-placeholder-border, #D1D5DB)",
  backgroundColor: "var(--of-guided-placeholder-bg, #F9FAFB)",
  color: "var(--of-guided-placeholder-color, #6B7280)",
  fontSize: "var(--of-font-size-sm, 12px)",
  fontFamily: "var(--of-font-family-base, system-ui, sans-serif)",
  fontWeight: "var(--of-font-weight-medium, 500)" as React.CSSProperties["fontWeight"],
  cursor: "pointer",
  transition: "all var(--of-transition-fast, 0.15s)",
};

const hoverStyle: React.CSSProperties = {
  border: "2px dashed var(--of-guided-placeholder-border-hover, #3B82F6)",
  color: "var(--of-guided-placeholder-color-hover, #3B82F6)",
};

/**
 * Ghost node rendered after every unconnected output in guided mode.
 * Clicking it opens the node chooser for that insertion point.
 */
export function AddNodePlaceholderView({ data }: NodeProps) {
  const t = useTranslation();
  const { requestInsertion } = useWorkflowEditorContext();
  const [hovered, setHovered] = useState(false);

  const insertion = (data as { insertion?: PendingInsertion }).insertion ?? {
    kind: "root",
  };
  const label =
    insertion.kind === "root" ? t("guided.chooseTrigger") : t("guided.addNode");

  return (
    <div
      style={{ ...baseStyle, ...(hovered ? hoverStyle : {}) }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => requestInsertion(insertion)}
      role="button"
      aria-label={label}
    >
      {insertion.kind !== "root" && (
        <Handle
          type="target"
          position={Position.Top}
          id="input"
          style={{ visibility: "hidden" }}
        />
      )}
      <span aria-hidden="true">+</span>
      <span>{label}</span>
    </div>
  );
}
