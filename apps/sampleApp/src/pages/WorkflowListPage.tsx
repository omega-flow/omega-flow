import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useWorkflows } from "../hooks/useWorkflows";
import { deleteWorkflow } from "../api/workflows";
import { CreateWorkflowDialog } from "../components/CreateWorkflowDialog";

const pageStyle: React.CSSProperties = {
  padding: "24px",
  maxWidth: "1200px",
  margin: "0 auto",
};

const headerStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: "24px",
};

const titleStyle: React.CSSProperties = {
  fontSize: "24px",
  fontWeight: 600,
  color: "#111827",
};

const createButtonStyle: React.CSSProperties = {
  padding: "10px 20px",
  fontSize: "14px",
  fontWeight: 500,
  backgroundColor: "#3B82F6",
  color: "#fff",
  border: "none",
  borderRadius: "8px",
  cursor: "pointer",
};

const listStyle: React.CSSProperties = {
  display: "grid",
  gap: "12px",
};

const itemStyle: React.CSSProperties = {
  backgroundColor: "#fff",
  border: "1px solid #E5E7EB",
  borderRadius: "8px",
  padding: "16px 20px",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
};

const itemLinkStyle: React.CSSProperties = {
  flex: 1,
  textDecoration: "none",
};

const itemNameStyle: React.CSSProperties = {
  fontSize: "16px",
  fontWeight: 500,
  color: "#111827",
};

const itemIdStyle: React.CSSProperties = {
  fontSize: "12px",
  color: "#9CA3AF",
  fontFamily: "monospace",
  marginTop: "4px",
};

const deleteButtonStyle: React.CSSProperties = {
  padding: "6px 12px",
  fontSize: "12px",
  backgroundColor: "#FEE2E2",
  color: "#DC2626",
  border: "none",
  borderRadius: "6px",
  cursor: "pointer",
};

const emptyStyle: React.CSSProperties = {
  textAlign: "center",
  padding: "48px",
  color: "#6B7280",
  fontSize: "16px",
};

const loadingStyle: React.CSSProperties = {
  textAlign: "center",
  padding: "48px",
  color: "#6B7280",
};

const errorStyle: React.CSSProperties = {
  backgroundColor: "#FEF2F2",
  color: "#DC2626",
  padding: "16px",
  borderRadius: "8px",
  marginBottom: "16px",
};

export function WorkflowListPage() {
  const { workflows, isLoading, error, refetch } = useWorkflows();
  const navigate = useNavigate();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!confirm("Are you sure you want to delete this workflow?")) return;

    try {
      await deleteWorkflow(id);
      refetch();
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "Failed to delete");
    }
  };

  const handleCreated = (workflowId: string) => {
    setShowCreateDialog(false);
    navigate(`/workflows/${workflowId}`);
  };

  if (isLoading) {
    return (
      <div style={pageStyle}>
        <div style={loadingStyle}>Loading workflows...</div>
      </div>
    );
  }

  return (
    <div style={pageStyle}>
      <header style={headerStyle}>
        <h1 style={titleStyle}>Workflows</h1>
        <button style={createButtonStyle} onClick={() => setShowCreateDialog(true)}>
          Create Workflow
        </button>
      </header>

      {error && <div style={errorStyle}>Error: {error.message}</div>}
      {deleteError && <div style={errorStyle}>{deleteError}</div>}

      {workflows.length === 0 ? (
        <div style={emptyStyle}>
          No workflows yet. Create your first workflow to get started.
        </div>
      ) : (
        <div style={listStyle}>
          {workflows.map((workflow) => (
            <div key={workflow.id} style={itemStyle}>
              <Link to={`/workflows/${workflow.id}`} style={itemLinkStyle}>
                <div style={itemNameStyle}>{workflow.name || "Untitled"}</div>
                <div style={itemIdStyle}>{workflow.id}</div>
              </Link>
              <button
                style={deleteButtonStyle}
                onClick={(e) => handleDelete(workflow.id, e)}
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      )}

      {showCreateDialog && (
        <CreateWorkflowDialog
          onClose={() => setShowCreateDialog(false)}
          onCreated={handleCreated}
        />
      )}
    </div>
  );
}
