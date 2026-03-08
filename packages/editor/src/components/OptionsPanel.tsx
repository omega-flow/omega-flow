import React from "react";
import { useWorkflowEditorContext } from "../context/WorkflowEditorContext";
import { useTranslation } from "../i18n";
import { SelectField, DurationField, FieldGroup } from "../primitives";
import type { OptionsPanelProps } from "../context/types";
import type { WorkflowFrequency } from "@omega-flow/types";

const panelStyle: React.CSSProperties = {
  backgroundColor: "var(--of-panel-bg, #fff)",
  borderRadius: "var(--of-panel-radius, 8px)",
  padding: "var(--of-panel-padding, 12px)",
  boxShadow: "var(--of-panel-shadow, 0 2px 8px rgba(0,0,0,0.1))",
  minWidth: "220px",
};

const titleStyle: React.CSSProperties = {
  fontSize: "var(--of-panel-title-size, 12px)",
  fontWeight: "var(--of-font-weight-semibold, 600)" as React.CSSProperties["fontWeight"],
  color: "var(--of-panel-title-color, #374151)",
  marginBottom: "var(--of-spacing-5, 12px)",
  textTransform: "uppercase",
  letterSpacing: "0.5px",
};

/**
 * Panel for editing workflow options like frequency.
 */
export function OptionsPanel({
  className,
  showFrequency = true,
  customOptions,
}: OptionsPanelProps) {
  const { options, setOptions } = useWorkflowEditorContext();
  const t = useTranslation();

  const frequencyOptions = [
    { value: "one_time", label: t("panels.options.frequencyOneTime") },
    { value: "every_rematch", label: t("panels.options.frequencyEveryRematch") },
  ];

  const handleFrequencyTypeChange = (type: string) => {
    const newFrequency: WorkflowFrequency = {
      type: type as "one_time" | "every_rematch",
    };
    if (type === "every_rematch") {
      newFrequency.interval = options.frequency?.interval ?? 3600;
    }
    setOptions({ ...options, frequency: newFrequency });
  };

  const handleIntervalChange = (ms: number) => {
    if (options.frequency) {
      const intervalInSeconds = Math.round(ms / 1000);
      setOptions({
        ...options,
        frequency: { ...options.frequency, interval: intervalInSeconds },
      });
    }
  };

  return (
    <div style={panelStyle} className={className}>
      <div style={titleStyle}>{t("panels.options.title")}</div>

      {showFrequency && (
        <FieldGroup label={t("panels.options.frequencyGroup")}>
          <SelectField
            label={t("panels.options.frequencyTypeLabel")}
            value={options.frequency?.type ?? "one_time"}
            options={frequencyOptions}
            onChange={handleFrequencyTypeChange}
            hint={t("panels.options.frequencyTypeHint")}
          />

          {options.frequency?.type === "every_rematch" && (
            <DurationField
              label={t("panels.options.intervalLabel")}
              value={(options.frequency?.interval ?? 3600) * 1000}
              onChange={handleIntervalChange}
              hint={t("panels.options.intervalHint")}
            />
          )}
        </FieldGroup>
      )}

      {customOptions}
    </div>
  );
}
