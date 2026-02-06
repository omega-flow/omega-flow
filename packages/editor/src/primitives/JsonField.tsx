import React, { useState, useEffect } from "react";
import { Field } from "./Field";
import { useTranslation } from "../i18n";

export interface JsonFieldProps {
  label: string;
  value: unknown;
  onChange: (value: unknown) => void;
  rows?: number;
  disabled?: boolean;
  error?: string;
  hint?: string;
}

const textareaStyle: React.CSSProperties = {
  padding: "var(--of-field-padding, 8px 10px)",
  borderRadius: "var(--of-field-radius, 6px)",
  border: "1px solid var(--of-field-border, #D1D5DB)",
  fontSize: "var(--of-font-size-sm, 12px)",
  fontFamily: "var(--of-font-family-mono, monospace)",
  color: "var(--of-color-text-primary, #111827)",
  outline: "none",
  transition: "border-color var(--of-transition-fast, 0.15s)",
  resize: "vertical",
};

/**
 * JSON input field with validation.
 * Displays JSON in a formatted textarea and validates on change.
 */
export function JsonField({
  label,
  value,
  onChange,
  rows = 6,
  disabled,
  error: externalError,
  hint,
}: JsonFieldProps) {
  const t = useTranslation();
  const [text, setText] = useState(() => JSON.stringify(value, null, 2));
  const [parseError, setParseError] = useState<string | null>(null);

  // Update text when external value changes
  useEffect(() => {
    setText(JSON.stringify(value, null, 2));
    setParseError(null);
  }, [value]);

  const handleChange = (newText: string) => {
    setText(newText);
    try {
      const parsed = JSON.parse(newText);
      setParseError(null);
      onChange(parsed);
    } catch (e) {
      setParseError(t("fields.json.invalidJson"));
    }
  };

  const error = externalError || parseError;

  return (
    <Field label={label} error={error ?? undefined} hint={hint}>
      <textarea
        value={text}
        onChange={(e) => handleChange(e.target.value)}
        rows={rows}
        disabled={disabled}
        style={{
          ...textareaStyle,
          borderColor: error
            ? "var(--of-field-border-error, #DC2626)"
            : "var(--of-field-border, #D1D5DB)",
          backgroundColor: disabled
            ? "var(--of-color-bg-disabled, #F3F4F6)"
            : "var(--of-field-bg, #fff)",
        }}
        onFocus={(e) => {
          if (!error)
            e.target.style.borderColor = "var(--of-field-border-focus, #3B82F6)";
        }}
        onBlur={(e) => {
          if (!error)
            e.target.style.borderColor = "var(--of-field-border, #D1D5DB)";
        }}
      />
    </Field>
  );
}
