import React from "react";
import type { ConditionRule } from "@omega-flow/types";
import type { ConditionProperties, OperatorOption } from "./types";
import { isPropertyGroup } from "./types";
import { useTranslation } from "../../i18n";
import { DynamicValueInput } from "../DynamicValueField";

interface ConditionRowProps {
  rule: ConditionRule;
  properties: ConditionProperties;
  operators: OperatorOption[];
  onChange: (rule: ConditionRule) => void;
  onRemove: () => void;
}

const rowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "var(--of-spacing-2, 6px)",
  marginBottom: "var(--of-spacing-2, 6px)",
};

const selectStyle: React.CSSProperties = {
  padding: "var(--of-spacing-2, 6px) var(--of-spacing-3, 8px)",
  borderRadius: "var(--of-field-radius, 6px)",
  border: "1px solid var(--of-field-border, #D1D5DB)",
  fontSize: "var(--of-font-size-sm, 12px)",
  outline: "none",
  backgroundColor: "var(--of-field-bg, #fff)",
  color: "var(--of-color-text-primary, #111827)",
  minWidth: 0,
};

const factSelectStyle: React.CSSProperties = {
  ...selectStyle,
  flex: "1 1 30%",
};

const operatorSelectStyle: React.CSSProperties = {
  ...selectStyle,
  flex: "1 1 30%",
};

const removeButtonStyle: React.CSSProperties = {
  padding: "var(--of-spacing-1, 4px) var(--of-spacing-2, 6px)",
  border: "none",
  background: "none",
  color: "var(--of-color-text-muted, #9CA3AF)",
  cursor: "pointer",
  fontSize: "var(--of-font-size-lg, 14px)",
  lineHeight: 1,
  borderRadius: "var(--of-radius-sm, 4px)",
  flexShrink: 0,
};

function parseValue(raw: string): unknown {
  if (raw === "true") return true;
  if (raw === "false") return false;
  const num = Number(raw);
  if (raw !== "" && !isNaN(num)) return num;
  return raw;
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value);
}

/**
 * A single condition row: [fact] [operator] [value] [remove]
 */
export function ConditionRow({
  rule,
  properties,
  operators,
  onChange,
  onRemove,
}: ConditionRowProps) {
  const t = useTranslation();
  const hasProperties = properties.length > 0;

  return (
    <div style={rowStyle}>
      {/* Fact selector */}
      {hasProperties ? (
        <select
          value={rule.fact}
          onChange={(e) => onChange({ ...rule, fact: e.target.value })}
          style={factSelectStyle}
        >
          <option value="">
            {t("conditionBuilder.selectProperty")}
          </option>
          {properties.map((item, idx) =>
            isPropertyGroup(item) ? (
              <optgroup key={idx} label={item.label}>
                {item.children.map((child) => (
                  <option key={child.value} value={child.value}>
                    {child.label}
                  </option>
                ))}
              </optgroup>
            ) : (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            )
          )}
        </select>
      ) : (
        <DynamicValueInput
          value={rule.fact}
          onChange={(fact) => onChange({ ...rule, fact })}
          placeholder={t("conditionBuilder.factPlaceholder")}
          style={{ flex: "1 1 30%" }}
        />
      )}

      {/* Operator selector */}
      <select
        value={rule.operator}
        onChange={(e) => onChange({ ...rule, operator: e.target.value })}
        style={operatorSelectStyle}
      >
        <option value="">
          {t("conditionBuilder.selectOperator")}
        </option>
        {operators.map((op) => (
          <option key={op.value} value={op.value}>
            {op.label}
          </option>
        ))}
      </select>

      {/* Value input */}
      <DynamicValueInput
        value={formatValue(rule.value)}
        onChange={(raw) => onChange({ ...rule, value: parseValue(raw) })}
        placeholder={t("conditionBuilder.valuePlaceholder")}
        style={{ flex: "1 1 25%" }}
      />

      {/* Remove button */}
      <button
        type="button"
        onClick={onRemove}
        style={removeButtonStyle}
        title={t("conditionBuilder.removeCondition")}
        onMouseEnter={(e) =>
          (e.currentTarget.style.color =
            "var(--of-color-status-error, #DC2626)")
        }
        onMouseLeave={(e) =>
          (e.currentTarget.style.color =
            "var(--of-color-text-muted, #9CA3AF)")
        }
      >
        ✕
      </button>
    </div>
  );
}
