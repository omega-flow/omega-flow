import React, { useState } from "react";
import { FieldGroup } from "../../primitives";
import {
  ConditionBuilderDialog,
  type ConditionProperties,
  type OperatorOption,
} from "../../primitives/condition-builder";
import { useTranslation } from "../../i18n";
import type { NodeDetailProps } from "../types";

interface ConditionData {
  conditions?: {
    all?: unknown[];
    any?: unknown[];
  };
}

export interface ConditionNodeDetailProps extends NodeDetailProps {
  /** Available properties for the condition builder fact selector */
  conditionProperties?: ConditionProperties;
  /** Custom operators for the condition builder (defaults to json-rules-engine built-ins) */
  conditionOperators?: OperatorOption[];
}

function countRules(conditions: ConditionData["conditions"]): number {
  if (!conditions) return 0;

  let count = 0;

  const countInArray = (arr: unknown[]) => {
    for (const item of arr) {
      if (item && typeof item === "object") {
        const obj = item as Record<string, unknown>;
        if ("fact" in obj) {
          count++;
        } else if (Array.isArray(obj.all)) {
          countInArray(obj.all);
        } else if (Array.isArray(obj.any)) {
          countInArray(obj.any);
        }
      }
    }
  };

  if (Array.isArray(conditions.all)) countInArray(conditions.all);
  if (Array.isArray(conditions.any)) countInArray(conditions.any);
  return count;
}

const openButtonStyle: React.CSSProperties = {
  width: "100%",
  padding: "var(--of-spacing-3, 8px) var(--of-spacing-4, 10px)",
  border: "1px solid var(--of-color-border-primary, #D1D5DB)",
  borderRadius: "var(--of-field-radius, 6px)",
  backgroundColor: "var(--of-field-bg, #fff)",
  color: "var(--of-color-text-primary, #111827)",
  cursor: "pointer",
  fontSize: "var(--of-field-font-size, 13px)",
  textAlign: "left",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
};

const ruleCountStyle: React.CSSProperties = {
  fontSize: "var(--of-font-size-xs, 11px)",
  color: "var(--of-color-text-muted, #9CA3AF)",
};

/**
 * Detail editor for Condition nodes.
 * Opens a visual condition builder dialog.
 */
export function ConditionNodeDetail({
  node,
  onChange,
  conditionProperties,
  conditionOperators,
}: ConditionNodeDetailProps) {
  const t = useTranslation();
  const data = node.data as ConditionData;
  const [dialogOpen, setDialogOpen] = useState(false);

  const conditions = data.conditions ?? { all: [] };
  const ruleCount = countRules(conditions);

  const handleConditionsChange = (updated: Record<string, unknown>) => {
    onChange({
      ...data,
      conditions: updated as ConditionData["conditions"],
    });
  };

  const ruleLabel =
    ruleCount === 0
      ? t("conditionBuilder.noConditions")
      : ruleCount === 1
        ? t("nodes.condition.ruleCountSingular")
        : t("nodes.condition.ruleCount", { count: String(ruleCount) });

  return (
    <FieldGroup label={t("nodeDetails.condition.group")}>
      <div style={{ marginBottom: "var(--of-spacing-5, 12px)" }}>
        <label
          style={{
            display: "block",
            fontSize: "var(--of-field-label-size, 12px)",
            fontWeight: "var(--of-font-weight-medium, 500)" as React.CSSProperties["fontWeight"],
            color: "var(--of-field-label-color, #374151)",
            marginBottom: "var(--of-spacing-1, 4px)",
          }}
        >
          {t("nodeDetails.condition.conditionsLabel")}
        </label>
        <button
          type="button"
          onClick={() => setDialogOpen(true)}
          style={openButtonStyle}
          onMouseEnter={(e) =>
            (e.currentTarget.style.borderColor =
              "var(--of-field-border-focus, #3B82F6)")
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.borderColor =
              "var(--of-color-border-primary, #D1D5DB)")
          }
        >
          <span>{ruleLabel}</span>
          <span style={ruleCountStyle}>
            {t("conditionBuilder.editButton")}
          </span>
        </button>
      </div>

      <ConditionBuilderDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        value={conditions}
        onChange={handleConditionsChange}
        properties={conditionProperties}
        operators={conditionOperators}
      />
    </FieldGroup>
  );
}
