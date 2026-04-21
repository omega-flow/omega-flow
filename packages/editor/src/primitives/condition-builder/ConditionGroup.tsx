import React from "react";
import type {
  ConditionGroupValue,
  ConditionRule,
  ConditionProperties,
  OperatorOption,
} from "./types";
import { ConditionRow } from "./ConditionRow";
import { useTranslation } from "../../i18n";

interface ConditionGroupProps {
  group: ConditionGroupValue;
  properties: ConditionProperties;
  operators: OperatorOption[];
  onChange: (group: ConditionGroupValue) => void;
  onRemove: () => void;
  canRemove: boolean;
}

const groupStyle: React.CSSProperties = {
  border: "1px solid var(--of-color-border-secondary, #E5E7EB)",
  borderRadius: "var(--of-radius-md, 6px)",
  padding: "var(--of-spacing-4, 10px)",
  backgroundColor: "var(--of-color-bg-secondary, #F9FAFB)",
};

const groupHeaderStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  marginBottom: "var(--of-spacing-3, 8px)",
};

const operatorToggleStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "var(--of-spacing-2, 6px)",
  fontSize: "var(--of-font-size-sm, 12px)",
  color: "var(--of-color-text-secondary, #374151)",
};

const toggleButtonBase: React.CSSProperties = {
  padding: "var(--of-spacing-1, 4px) var(--of-spacing-3, 8px)",
  border: "1px solid var(--of-color-border-primary, #D1D5DB)",
  borderRadius: "var(--of-radius-sm, 4px)",
  fontSize: "var(--of-font-size-xs, 11px)",
  fontWeight: "var(--of-font-weight-semibold, 600)" as React.CSSProperties["fontWeight"],
  cursor: "pointer",
  transition: "all var(--of-transition-fast, 0.15s)",
};

const removeGroupButtonStyle: React.CSSProperties = {
  padding: "var(--of-spacing-1, 4px) var(--of-spacing-2, 6px)",
  border: "none",
  background: "none",
  color: "var(--of-color-text-muted, #9CA3AF)",
  cursor: "pointer",
  fontSize: "var(--of-font-size-sm, 12px)",
  borderRadius: "var(--of-radius-sm, 4px)",
};

const addConditionButtonStyle: React.CSSProperties = {
  padding: "var(--of-spacing-1, 4px) var(--of-spacing-3, 8px)",
  border: "1px dashed var(--of-color-border-primary, #D1D5DB)",
  background: "none",
  color: "var(--of-color-text-tertiary, #6B7280)",
  cursor: "pointer",
  fontSize: "var(--of-font-size-xs, 11px)",
  borderRadius: "var(--of-radius-sm, 4px)",
  width: "100%",
  marginTop: "var(--of-spacing-2, 6px)",
};

const emptyStyle: React.CSSProperties = {
  fontSize: "var(--of-font-size-xs, 11px)",
  color: "var(--of-color-text-muted, #9CA3AF)",
  textAlign: "center",
  padding: "var(--of-spacing-3, 8px) 0",
};

function createEmptyRule(): ConditionRule {
  return { fact: "", operator: "equal", value: "" };
}

/**
 * A group of conditions with AND/OR operator toggle.
 */
export function ConditionGroup({
  group,
  properties,
  operators,
  onChange,
  onRemove,
  canRemove,
}: ConditionGroupProps) {
  const t = useTranslation();

  const handleOperatorChange = (operator: "all" | "any") => {
    onChange({ ...group, operator });
  };

  const handleRuleChange = (index: number, rule: ConditionRule) => {
    const conditions = [...group.conditions];
    conditions[index] = rule;
    onChange({ ...group, conditions });
  };

  const handleRuleRemove = (index: number) => {
    const conditions = group.conditions.filter((_, i) => i !== index);
    onChange({ ...group, conditions });
  };

  const handleAddCondition = () => {
    onChange({
      ...group,
      conditions: [...group.conditions, createEmptyRule()],
    });
  };

  const isAnd = group.operator === "all";

  return (
    <div style={groupStyle}>
      <div style={groupHeaderStyle}>
        <div style={operatorToggleStyle}>
          <span>{t("conditionBuilder.matchLabel")}</span>
          <button
            type="button"
            onClick={() => handleOperatorChange("all")}
            style={{
              ...toggleButtonBase,
              backgroundColor: isAnd
                ? "var(--of-color-interactive-primary, #3B82F6)"
                : "var(--of-field-bg, #fff)",
              color: isAnd
                ? "var(--of-color-text-inverse, #fff)"
                : "var(--of-color-text-secondary, #374151)",
              borderColor: isAnd
                ? "var(--of-color-interactive-primary, #3B82F6)"
                : "var(--of-color-border-primary, #D1D5DB)",
            }}
          >
            AND
          </button>
          <button
            type="button"
            onClick={() => handleOperatorChange("any")}
            style={{
              ...toggleButtonBase,
              backgroundColor: !isAnd
                ? "var(--of-color-interactive-primary, #3B82F6)"
                : "var(--of-field-bg, #fff)",
              color: !isAnd
                ? "var(--of-color-text-inverse, #fff)"
                : "var(--of-color-text-secondary, #374151)",
              borderColor: !isAnd
                ? "var(--of-color-interactive-primary, #3B82F6)"
                : "var(--of-color-border-primary, #D1D5DB)",
            }}
          >
            OR
          </button>
        </div>

        {canRemove && (
          <button
            type="button"
            onClick={onRemove}
            style={removeGroupButtonStyle}
            title={t("conditionBuilder.removeGroup")}
            onMouseEnter={(e) =>
              (e.currentTarget.style.color =
                "var(--of-color-status-error, #DC2626)")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.color =
                "var(--of-color-text-muted, #9CA3AF)")
            }
          >
            {t("conditionBuilder.removeGroup")}
          </button>
        )}
      </div>

      {group.conditions.length === 0 ? (
        <div style={emptyStyle}>
          {t("conditionBuilder.emptyGroup")}
        </div>
      ) : (
        group.conditions.map((rule, index) => (
          <ConditionRow
            key={index}
            rule={rule}
            properties={properties}
            operators={operators}
            onChange={(updated) => handleRuleChange(index, updated)}
            onRemove={() => handleRuleRemove(index)}
          />
        ))
      )}

      <button
        type="button"
        onClick={handleAddCondition}
        style={addConditionButtonStyle}
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
        + {t("conditionBuilder.addCondition")}
      </button>
    </div>
  );
}
