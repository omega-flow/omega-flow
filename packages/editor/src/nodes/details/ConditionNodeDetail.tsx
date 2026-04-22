import React, { useState } from "react";
import type { Conditions } from "@omega-flow/types";
import { FieldGroup } from "../../primitives";
import {
  ConditionBuilderDialog,
  type ConditionProperties,
  type OperatorOption,
} from "../../primitives/condition-builder";
import { useTranslation } from "../../i18n";
import type { NodeDetailProps } from "../types";

interface ConditionData {
  conditions?: Conditions;
}

export interface ConditionNodeDetailProps extends NodeDetailProps {
  /** Available properties for the condition builder fact selector */
  conditionProperties?: ConditionProperties;
  /** Custom operators for the condition builder (defaults to the built-in set) */
  conditionOperators?: OperatorOption[];
}

const EMPTY_CONDITIONS: Conditions = {
  groups: [{ operator: "all", conditions: [] }],
};

function countRules(conditions: Conditions | undefined): number {
  if (!conditions || !Array.isArray(conditions.groups)) return 0;
  return conditions.groups.reduce(
    (sum, group) => sum + (group.conditions?.length ?? 0),
    0
  );
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

  const conditions = data.conditions ?? EMPTY_CONDITIONS;
  const ruleCount = countRules(conditions);

  const handleConditionsChange = (updated: Conditions) => {
    onChange({
      ...data,
      conditions: updated,
    });
  };

  const ruleLabel =
    ruleCount === 0
      ? t("conditionBuilder.noConditions")
      : ruleCount === 1
        ? t("conditionBuilder.ruleCountSingular")
        : t("conditionBuilder.ruleCount", { count: String(ruleCount) });

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
