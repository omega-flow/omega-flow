import React, { useState } from "react";
import { createWorkflow } from "../api/workflows";

interface CreateWorkflowDialogProps {
  onClose: () => void;
  onCreated: (workflowId: string) => void;
}

const overlayStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  backgroundColor: "rgba(0, 0, 0, 0.5)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 1000,
};

const dialogStyle: React.CSSProperties = {
  backgroundColor: "#fff",
  borderRadius: "12px",
  padding: "24px",
  width: "400px",
  maxWidth: "90vw",
  boxShadow: "0 20px 40px rgba(0, 0, 0, 0.2)",
};

const titleStyle: React.CSSProperties = {
  fontSize: "18px",
  fontWeight: 600,
  marginBottom: "16px",
  color: "#111827",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  fontSize: "14px",
  border: "1px solid #D1D5DB",
  borderRadius: "8px",
  outline: "none",
  boxSizing: "border-box",
};

const actionsStyle: React.CSSProperties = {
  display: "flex",
  gap: "12px",
  justifyContent: "flex-end",
  marginTop: "24px",
};

const buttonStyle: React.CSSProperties = {
  padding: "10px 20px",
  fontSize: "14px",
  fontWeight: 500,
  borderRadius: "8px",
  cursor: "pointer",
  border: "none",
};

const cancelButtonStyle: React.CSSProperties = {
  ...buttonStyle,
  backgroundColor: "#F3F4F6",
  color: "#374151",
};

const createButtonStyle: React.CSSProperties = {
  ...buttonStyle,
  backgroundColor: "#3B82F6",
  color: "#fff",
};

const errorStyle: React.CSSProperties = {
  color: "#DC2626",
  fontSize: "13px",
  marginTop: "8px",
};

export function CreateWorkflowDialog({
  onClose,
  onCreated,
}: CreateWorkflowDialogProps) {
  const [name, setName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!name.trim()) {
      setError("Name is required");
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      const workflow = await createWorkflow(name.trim());
      onCreated(workflow.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create workflow");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={dialogStyle} onClick={(e) => e.stopPropagation()}>
        <h2 style={titleStyle}>Create New Workflow</h2>

        <input
          type="text"
          placeholder="Workflow name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={inputStyle}
          autoFocus
          onKeyDown={(e) => {
            if (e.key === "Enter") handleCreate();
            if (e.key === "Escape") onClose();
          }}
        />

        {error && <p style={errorStyle}>{error}</p>}

        <div style={actionsStyle}>
          <button style={cancelButtonStyle} onClick={onClose} disabled={isCreating}>
            Cancel
          </button>
          <button
            style={createButtonStyle}
            onClick={handleCreate}
            disabled={isCreating || !name.trim()}
          >
            {isCreating ? "Creating..." : "Create"}
          </button>
        </div>
      </div>
    </div>
  );
}
