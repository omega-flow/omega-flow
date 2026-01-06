import React, { useState, useEffect } from "react";
import { Field } from "./Field";

export interface DurationFieldProps {
  label: string;
  /** Value in milliseconds */
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  error?: string;
  hint?: string;
}

type DurationUnit = "ms" | "s" | "min" | "h";

const units: { value: DurationUnit; label: string; multiplier: number }[] = [
  { value: "ms", label: "Milliseconds", multiplier: 1 },
  { value: "s", label: "Seconds", multiplier: 1000 },
  { value: "min", label: "Minutes", multiplier: 60000 },
  { value: "h", label: "Hours", multiplier: 3600000 },
];

function msToUnit(ms: number): { value: number; unit: DurationUnit } {
  if (ms >= 3600000 && ms % 3600000 === 0) {
    return { value: ms / 3600000, unit: "h" };
  }
  if (ms >= 60000 && ms % 60000 === 0) {
    return { value: ms / 60000, unit: "min" };
  }
  if (ms >= 1000 && ms % 1000 === 0) {
    return { value: ms / 1000, unit: "s" };
  }
  return { value: ms, unit: "ms" };
}

const containerStyle: React.CSSProperties = {
  display: "flex",
  gap: "8px",
};

const inputStyle: React.CSSProperties = {
  flex: 1,
  padding: "8px 10px",
  borderRadius: "6px",
  border: "1px solid #D1D5DB",
  fontSize: "13px",
  outline: "none",
};

const selectStyle: React.CSSProperties = {
  padding: "8px 10px",
  borderRadius: "6px",
  border: "1px solid #D1D5DB",
  fontSize: "13px",
  outline: "none",
  backgroundColor: "#fff",
};

/**
 * Duration input field with unit selector (ms, s, min, h).
 * Value is stored in milliseconds but displayed in a user-friendly unit.
 */
export function DurationField({
  label,
  value,
  onChange,
  disabled,
  error,
  hint,
}: DurationFieldProps) {
  const initial = msToUnit(value);
  const [displayValue, setDisplayValue] = useState(initial.value);
  const [unit, setUnit] = useState<DurationUnit>(initial.unit);

  // Update display when external value changes
  useEffect(() => {
    const converted = msToUnit(value);
    setDisplayValue(converted.value);
    setUnit(converted.unit);
  }, [value]);

  const handleValueChange = (newValue: number) => {
    setDisplayValue(newValue);
    const unitInfo = units.find((u) => u.value === unit)!;
    onChange(newValue * unitInfo.multiplier);
  };

  const handleUnitChange = (newUnit: DurationUnit) => {
    setUnit(newUnit);
    const unitInfo = units.find((u) => u.value === newUnit)!;
    onChange(displayValue * unitInfo.multiplier);
  };

  return (
    <Field label={label} error={error} hint={hint}>
      <div style={containerStyle}>
        <input
          type="number"
          value={displayValue}
          onChange={(e) => handleValueChange(parseFloat(e.target.value) || 0)}
          min={0}
          disabled={disabled}
          style={{
            ...inputStyle,
            borderColor: error ? "#DC2626" : "#D1D5DB",
            backgroundColor: disabled ? "#F3F4F6" : "#fff",
          }}
        />
        <select
          value={unit}
          onChange={(e) => handleUnitChange(e.target.value as DurationUnit)}
          disabled={disabled}
          style={{
            ...selectStyle,
            backgroundColor: disabled ? "#F3F4F6" : "#fff",
          }}
        >
          {units.map((u) => (
            <option key={u.value} value={u.value}>
              {u.label}
            </option>
          ))}
        </select>
      </div>
    </Field>
  );
}
