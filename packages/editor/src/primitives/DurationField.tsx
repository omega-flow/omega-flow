import React, { useState, useEffect } from "react";
import { Field } from "./Field";
import { useTranslation } from "../i18n";
import { msToParts, partsToMs, type DurationParts } from "../utils/duration";

export interface DurationFieldProps {
  label: string;
  /** Value in milliseconds */
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  error?: string;
  hint?: string;
}

const containerStyle: React.CSSProperties = {
  display: "flex",
  gap: "var(--of-spacing-3, 8px)",
};

const unitGroupStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "var(--of-spacing-2, 4px)",
};

const inputStyle: React.CSSProperties = {
  width: "60px",
  padding: "var(--of-field-padding, 8px 10px)",
  borderRadius: "var(--of-field-radius, 6px)",
  border: "1px solid var(--of-field-border, #D1D5DB)",
  fontSize: "var(--of-field-font-size, 13px)",
  color: "var(--of-color-text-primary, #111827)",
  outline: "none",
  textAlign: "center" as const,
};

const labelStyle: React.CSSProperties = {
  fontSize: "var(--of-field-font-size, 13px)",
  color: "var(--of-color-text-secondary, #6B7280)",
};

/**
 * Duration input field with separate inputs for days, hours, and minutes.
 * Value is stored in milliseconds but displayed as composite parts.
 */
export function DurationField({
  label,
  value,
  onChange,
  disabled,
  error,
  hint,
}: DurationFieldProps) {
  const t = useTranslation();
  const initial = msToParts(value);
  const [parts, setParts] = useState<DurationParts>(initial);

  // Update display when external value changes
  useEffect(() => {
    const converted = msToParts(value);
    setParts(converted);
  }, [value]);

  const handlePartChange = (part: keyof DurationParts, newValue: number) => {
    const sanitizedValue = Math.max(0, Math.floor(newValue) || 0);
    const newParts = { ...parts, [part]: sanitizedValue };
    setParts(newParts);
    onChange(partsToMs(newParts));
  };

  const getInputStyle = (): React.CSSProperties => ({
    ...inputStyle,
    borderColor: error
      ? "var(--of-field-border-error, #DC2626)"
      : "var(--of-field-border, #D1D5DB)",
    backgroundColor: disabled
      ? "var(--of-color-bg-disabled, #F3F4F6)"
      : "var(--of-field-bg, #fff)",
  });

  return (
    <Field label={label} error={error} hint={hint}>
      <div style={containerStyle}>
        <div style={unitGroupStyle}>
          <input
            type="number"
            value={parts.days}
            onChange={(e) => handlePartChange("days", parseFloat(e.target.value))}
            min={0}
            disabled={disabled}
            style={getInputStyle()}
          />
          <span style={labelStyle}>{t("fields.duration.days")}</span>
        </div>
        <div style={unitGroupStyle}>
          <input
            type="number"
            value={parts.hours}
            onChange={(e) => handlePartChange("hours", parseFloat(e.target.value))}
            min={0}
            max={23}
            disabled={disabled}
            style={getInputStyle()}
          />
          <span style={labelStyle}>{t("fields.duration.hours")}</span>
        </div>
        <div style={unitGroupStyle}>
          <input
            type="number"
            value={parts.minutes}
            onChange={(e) => handlePartChange("minutes", parseFloat(e.target.value))}
            min={0}
            max={59}
            disabled={disabled}
            style={getInputStyle()}
          />
          <span style={labelStyle}>{t("fields.duration.minutes")}</span>
        </div>
      </div>
    </Field>
  );
}
