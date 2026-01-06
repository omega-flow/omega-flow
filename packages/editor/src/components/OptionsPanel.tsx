import React from "react";
import { useWorkflowEditorContext } from "../context/WorkflowEditorContext";
import { SelectField, NumberField, FieldGroup } from "../primitives";
import type { OptionsPanelProps } from "../context/types";
import type { WorkflowFrequency } from "@omega-flow/types";

const panelStyle: React.CSSProperties = {
  backgroundColor: "#fff",
  borderRadius: "8px",
  padding: "12px",
  boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
  minWidth: "220px",
};

const titleStyle: React.CSSProperties = {
  fontSize: "12px",
  fontWeight: 600,
  color: "#374151",
  marginBottom: "12px",
  textTransform: "uppercase",
  letterSpacing: "0.5px",
};

const frequencyOptions = [
  { value: "one_time", label: "One time" },
  { value: "every_rematch", label: "Every rematch" },
];

/**
 * Panel for editing workflow options like frequency.
 */
export function OptionsPanel({
  className,
  showFrequency = true,
  customOptions,
}: OptionsPanelProps) {
  const { options, setOptions } = useWorkflowEditorContext();

  const handleFrequencyTypeChange = (type: string) => {
    const newFrequency: WorkflowFrequency = {
      type: type as "one_time" | "every_rematch",
    };
    if (type === "every_rematch") {
      newFrequency.interval = options.frequency?.interval ?? 3600;
    }
    setOptions({ ...options, frequency: newFrequency });
  };

  const handleIntervalChange = (interval: number) => {
    if (options.frequency) {
      setOptions({
        ...options,
        frequency: { ...options.frequency, interval },
      });
    }
  };

  return (
    <div style={panelStyle} className={className}>
      <div style={titleStyle}>Options</div>

      {showFrequency && (
        <FieldGroup label="Frequency">
          <SelectField
            label="Type"
            value={options.frequency?.type ?? "one_time"}
            options={frequencyOptions}
            onChange={handleFrequencyTypeChange}
            hint="How often this workflow can run for a subject"
          />

          {options.frequency?.type === "every_rematch" && (
            <NumberField
              label="Interval (seconds)"
              value={options.frequency?.interval ?? 3600}
              onChange={handleIntervalChange}
              min={1}
              hint="Minimum time between runs"
            />
          )}
        </FieldGroup>
      )}

      {customOptions}
    </div>
  );
}
