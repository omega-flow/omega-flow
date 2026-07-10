import React, { useState } from "react";
import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  type EdgeProps,
} from "@xyflow/react";
import { useWorkflowEditorContext } from "../context/WorkflowEditorContext";
import { useTranslation } from "../i18n";

const buttonStyle: React.CSSProperties = {
  width: "20px",
  height: "20px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: "50%",
  border: "1px solid var(--of-guided-add-button-border, #D1D5DB)",
  backgroundColor: "var(--of-guided-add-button-bg, #fff)",
  color: "var(--of-guided-add-button-color, #374151)",
  fontSize: "14px",
  lineHeight: 1,
  fontFamily: "var(--of-font-family-base, system-ui, sans-serif)",
  cursor: "pointer",
  padding: 0,
  transition: "all var(--of-transition-fast, 0.15s)",
};

const buttonHoverStyle: React.CSSProperties = {
  color: "var(--of-guided-add-button-color-hover, #3B82F6)",
  border: "1px solid var(--of-guided-add-button-border-hover, #3B82F6)",
};

/**
 * Guided-mode edge. Real connections render with a midpoint "+" button that
 * inserts a node between the two endpoints; virtual placeholder edges render
 * dashed with no button.
 */
export function InsertableEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  markerEnd,
}: EdgeProps) {
  const t = useTranslation();
  const { requestInsertion } = useWorkflowEditorContext();
  const [hovered, setHovered] = useState(false);

  const [path, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
  });

  const isPlaceholderEdge = Boolean(
    (data as { placeholder?: boolean } | undefined)?.placeholder
  );

  return (
    <>
      <BaseEdge
        id={id}
        path={path}
        markerEnd={markerEnd}
        style={{
          stroke: "var(--of-guided-edge-color, #D1D5DB)",
          strokeDasharray: isPlaceholderEdge ? "4 4" : undefined,
        }}
      />
      {!isPlaceholderEdge && (
        <EdgeLabelRenderer>
          <button
            type="button"
            style={{
              ...buttonStyle,
              ...(hovered ? buttonHoverStyle : {}),
              position: "absolute",
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
              pointerEvents: "all",
            }}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            onClick={() => requestInsertion({ kind: "edge", edgeId: id })}
            title={t("guided.insertNode")}
            aria-label={t("guided.insertNode")}
          >
            +
          </button>
        </EdgeLabelRenderer>
      )}
    </>
  );
}
