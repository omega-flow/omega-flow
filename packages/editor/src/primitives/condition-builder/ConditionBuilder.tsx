import React from "react";
import type { Conditions, ConditionGroup } from "@omega-flow/types";
import type { ConditionBuilderProps } from "./types";
import { ConditionGroupView } from "./ConditionGroup";
import { defaultOperators } from "./operators";
import { useTranslation } from "../../i18n";

const containerStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "var(--of-spacing-3, 8px)",
};

const topLabelStyle: React.CSSProperties = {
  fontSize: "var(--of-font-size-sm, 12px)",
  fontWeight: "var(--of-font-weight-medium, 500)" as React.CSSProperties["fontWeight"],
  color: "var(--of-color-text-secondary, #374151)",
  marginBottom: "var(--of-spacing-1, 4px)",
};

const orDividerStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "var(--of-spacing-3, 8px)",
  margin: "var(--of-spacing-1, 4px) 0",
};

const orLineStyle: React.CSSProperties = {
  flex: 1,
  height: "1px",
  backgroundColor: "var(--of-color-border-secondary, #E5E7EB)",
};

const orTextStyle: React.CSSProperties = {
  fontSize: "var(--of-font-size-xs, 11px)",
  fontWeight: "var(--of-font-weight-semibold, 600)" as React.CSSProperties["fontWeight"],
  color: "var(--of-color-text-muted, #9CA3AF)",
  textTransform: "uppercase",
  letterSpacing: "0.5px",
};

const addGroupButtonStyle: React.CSSProperties = {
  padding: "var(--of-spacing-3, 8px) var(--of-spacing-4, 10px)",
  border: "1px dashed var(--of-color-border-primary, #D1D5DB)",
  background: "none",
  color: "var(--of-color-text-tertiary, #6B7280)",
  cursor: "pointer",
  fontSize: "var(--of-font-size-sm, 12px)",
  borderRadius: "var(--of-radius-md, 6px)",
  marginTop: "var(--of-spacing-2, 6px)",
};

function normalize(value: Conditions | undefined): Conditions {
  if (!value || !Array.isArray(value.groups) || value.groups.length === 0) {
    return { groups: [{ operator: "all", conditions: [] }] };
  }
  return value;
}

/**
 * Visual condition builder for the unified Conditions format.
 *
 * Top level is always OR (between groups), each group inside can be AND or OR.
 */
export function ConditionBuilder({
  value,
  onChange,
  properties = [],
  operators = defaultOperators,
}: ConditionBuilderProps) {
  const t = useTranslation();
  const current = normalize(value);

  const emit = (groups: ConditionGroup[]) => {
    onChange({ groups: groups.length > 0 ? groups : [{ operator: "all", conditions: [] }] });
  };

  const handleGroupChange = (index: number, group: ConditionGroup) => {
    const groups = [...current.groups];
    groups[index] = group;
    emit(groups);
  };

  const handleGroupRemove = (index: number) => {
    emit(current.groups.filter((_, i) => i !== index));
  };

  const handleAddGroup = () => {
    emit([
      ...current.groups,
      { operator: "all", conditions: [{ fact: "", operator: "equal", value: "" }] },
    ]);
  };

  return (
    <div style={containerStyle}>
      <div style={topLabelStyle}>
        {t("conditionBuilder.topLevelLabel")}
      </div>

      {current.groups.map((group, index) => (
        <React.Fragment key={index}>
          {index > 0 && (
            <div style={orDividerStyle}>
              <div style={orLineStyle} />
              <span style={orTextStyle}>OR</span>
              <div style={orLineStyle} />
            </div>
          )}
          <ConditionGroupView
            group={group}
            properties={properties}
            operators={operators}
            onChange={(updated) => handleGroupChange(index, updated)}
            onRemove={() => handleGroupRemove(index)}
            canRemove={current.groups.length > 1}
          />
        </React.Fragment>
      ))}

      <button
        type="button"
        onClick={handleAddGroup}
        style={addGroupButtonStyle}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor =
            "var(--of-color-interactive-primary, #3B82F6)";
          e.currentTarget.style.color =
            "var(--of-color-interactive-primary, #3B82F6)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor =
            "var(--of-color-border-primary, #D1D5DB)";
          e.currentTarget.style.color =
            "var(--of-color-text-tertiary, #6B7280)";
        }}
      >
        + {t("conditionBuilder.addGroup")}
      </button>
    </div>
  );
}
