import React, { useState } from "react";
import { useWorkflowEditorContext } from "../context/WorkflowEditorContext";
import { TextField } from "../primitives";
import type { ControlPanelProps } from "../context/types";

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

const actionsStyle: React.CSSProperties = {
  display: "flex",
  gap: "var(--of-spacing-3, 8px)",
  marginTop: "var(--of-spacing-5, 12px)",
};

const buttonStyle: React.CSSProperties = {
  padding: "var(--of-button-padding, 8px 16px)",
  fontSize: "var(--of-field-font-size, 13px)",
  fontWeight: "var(--of-font-weight-medium, 500)" as React.CSSProperties["fontWeight"],
  borderRadius: "var(--of-button-radius, 6px)",
  cursor: "pointer",
  border: "none",
  transition: "all var(--of-transition-fast, 0.15s)",
};

const saveButtonStyle: React.CSSProperties = {
  ...buttonStyle,
  backgroundColor: "var(--of-button-primary-bg, #3B82F6)",
  color: "var(--of-button-primary-color, #fff)",
};

const saveButtonDisabledStyle: React.CSSProperties = {
  ...saveButtonStyle,
  backgroundColor: "var(--of-button-primary-bg-disabled, #93C5FD)",
  cursor: "not-allowed",
};

const statusStyle: React.CSSProperties = {
  fontSize: "var(--of-font-size-xs, 11px)",
  color: "var(--of-color-text-tertiary, #6B7280)",
  marginTop: "var(--of-spacing-3, 8px)",
};

/**
 * Panel for editing workflow name and saving.
 */
export function ControlPanel({
  className,
  showName = true,
  showSaveButton = true,
  saveButtonLabel = "Save",
  onSave,
  renderActions,
}: ControlPanelProps) {
  const { name, setName, isDirty, getWorkflow, markClean } =
    useWorkflowEditorContext();
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"saved" | "error" | null>(null);

  const handleSave = async () => {
    if (!onSave || isSaving) return;

    setIsSaving(true);
    setSaveStatus(null);

    try {
      await onSave();
      markClean();
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus(null), 2000);
    } catch (error) {
      console.error("Failed to save workflow:", error);
      setSaveStatus("error");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div style={panelStyle} className={className}>
      <div style={titleStyle}>Workflow</div>

      {showName && (
        <TextField
          label="Name"
          value={name}
          onChange={setName}
          placeholder="Workflow name"
        />
      )}

      <div style={actionsStyle}>
        {showSaveButton && onSave && (
          <button
            style={isSaving || !isDirty ? saveButtonDisabledStyle : saveButtonStyle}
            onClick={handleSave}
            disabled={isSaving || !isDirty}
          >
            {isSaving ? "Saving..." : saveButtonLabel}
          </button>
        )}

        {renderActions?.({ isDirty, workflow: getWorkflow() })}
      </div>

      {saveStatus && (
        <div
          style={{
            ...statusStyle,
            color:
              saveStatus === "saved"
                ? "var(--of-color-status-success, #059669)"
                : "var(--of-color-status-error, #DC2626)",
          }}
        >
          {saveStatus === "saved" ? "Saved successfully" : "Failed to save"}
        </div>
      )}

      {isDirty && !saveStatus && (
        <div style={statusStyle}>Unsaved changes</div>
      )}
    </div>
  );
}
