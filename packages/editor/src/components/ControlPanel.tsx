import React, { useState } from "react";
import { useWorkflowEditorContext } from "../context/WorkflowEditorContext";
import { TextField } from "../primitives";
import type { ControlPanelProps } from "../context/types";

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

const actionsStyle: React.CSSProperties = {
  display: "flex",
  gap: "8px",
  marginTop: "12px",
};

const buttonStyle: React.CSSProperties = {
  padding: "8px 16px",
  fontSize: "13px",
  fontWeight: 500,
  borderRadius: "6px",
  cursor: "pointer",
  border: "none",
  transition: "all 0.15s",
};

const saveButtonStyle: React.CSSProperties = {
  ...buttonStyle,
  backgroundColor: "#3B82F6",
  color: "#fff",
};

const saveButtonDisabledStyle: React.CSSProperties = {
  ...saveButtonStyle,
  backgroundColor: "#93C5FD",
  cursor: "not-allowed",
};

const statusStyle: React.CSSProperties = {
  fontSize: "11px",
  color: "#6B7280",
  marginTop: "8px",
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
            color: saveStatus === "saved" ? "#059669" : "#DC2626",
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
