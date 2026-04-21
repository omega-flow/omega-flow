import React, { useState, useCallback, useEffect, useRef } from "react";
import type {
  ConditionBuilderProps,
  ConditionBuilderValue,
  ConditionGroupValue,
} from "./types";
import { ConditionGroup } from "./ConditionGroup";
import { defaultOperators } from "./operators";
import { fromEngineFormat, toEngineFormat } from "./conversion";
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

/**
 * Visual condition builder for json-rules-engine rules.
 *
 * Top level is always OR (any), each group inside can be AND or OR.
 */
export function ConditionBuilder({
  value,
  onChange,
  properties = [],
  operators = defaultOperators,
}: ConditionBuilderProps) {
  const t = useTranslation();

  const [builderValue, setBuilderValue] = useState<ConditionBuilderValue>(() =>
    fromEngineFormat(value)
  );

  // Track whether the latest value change came from this component
  // so the sync effect can skip self-caused updates.
  const isInternalChange = useRef(false);

  // Sync only when the value changes externally (e.g., undo, dialog reset).
  useEffect(() => {
    if (isInternalChange.current) {
      isInternalChange.current = false;
      return;
    }
    setBuilderValue(fromEngineFormat(value));
  }, [value]);

  const emitChange = useCallback(
    (next: ConditionBuilderValue) => {
      isInternalChange.current = true;
      setBuilderValue(next);
      onChange(toEngineFormat(next));
    },
    [onChange]
  );

  const handleGroupChange = (index: number, group: ConditionGroupValue) => {
    const groups = [...builderValue.groups];
    groups[index] = group;
    emitChange({ groups });
  };

  const handleGroupRemove = (index: number) => {
    const groups = builderValue.groups.filter((_, i) => i !== index);
    emitChange({ groups: groups.length > 0 ? groups : [{ operator: "all", conditions: [] }] });
  };

  const handleAddGroup = () => {
    emitChange({
      groups: [
        ...builderValue.groups,
        { operator: "all", conditions: [{ fact: "", operator: "equal", value: "" }] },
      ],
    });
  };

  return (
    <div style={containerStyle}>
      <div style={topLabelStyle}>
        {t("conditionBuilder.topLevelLabel")}
      </div>

      {builderValue.groups.map((group, index) => (
        <React.Fragment key={index}>
          {index > 0 && (
            <div style={orDividerStyle}>
              <div style={orLineStyle} />
              <span style={orTextStyle}>OR</span>
              <div style={orLineStyle} />
            </div>
          )}
          <ConditionGroup
            group={group}
            properties={properties}
            operators={operators}
            onChange={(updated) => handleGroupChange(index, updated)}
            onRemove={() => handleGroupRemove(index)}
            canRemove={builderValue.groups.length > 1}
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
