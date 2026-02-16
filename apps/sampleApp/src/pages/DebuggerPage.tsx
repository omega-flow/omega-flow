import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useContexts } from "../hooks/useContexts";
import { useWorkflows } from "../hooks/useWorkflows";
import { executeEvent } from "../api/execute";
import { deleteContext } from "../api/contexts";

const pageStyle: React.CSSProperties = {
  padding: "24px",
  maxWidth: "1400px",
  margin: "0 auto",
};

const headerStyle: React.CSSProperties = {
  marginBottom: "24px",
};

const titleStyle: React.CSSProperties = {
  fontSize: "24px",
  fontWeight: 600,
  color: "#111827",
};

const gridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "400px 1fr",
  gap: "24px",
};

const sectionStyle: React.CSSProperties = {
  backgroundColor: "#fff",
  border: "1px solid #E5E7EB",
  borderRadius: "8px",
  padding: "20px",
};

const sectionTitleStyle: React.CSSProperties = {
  fontSize: "16px",
  fontWeight: 600,
  color: "#111827",
  marginBottom: "16px",
};

const formGroupStyle: React.CSSProperties = {
  marginBottom: "16px",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: "14px",
  fontWeight: 500,
  color: "#374151",
  marginBottom: "6px",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  fontSize: "14px",
  border: "1px solid #D1D5DB",
  borderRadius: "6px",
  boxSizing: "border-box",
};

const textareaStyle: React.CSSProperties = {
  ...inputStyle,
  minHeight: "120px",
  fontFamily: "monospace",
  resize: "vertical",
};

const buttonStyle: React.CSSProperties = {
  padding: "10px 20px",
  fontSize: "14px",
  fontWeight: 500,
  backgroundColor: "#3B82F6",
  color: "#fff",
  border: "none",
  borderRadius: "8px",
  cursor: "pointer",
};

const buttonDisabledStyle: React.CSSProperties = {
  ...buttonStyle,
  backgroundColor: "#9CA3AF",
  cursor: "not-allowed",
};

const secondaryButtonStyle: React.CSSProperties = {
  ...buttonStyle,
  backgroundColor: "#6B7280",
};

const successStyle: React.CSSProperties = {
  backgroundColor: "#D1FAE5",
  color: "#065F46",
  padding: "12px",
  borderRadius: "6px",
  fontSize: "13px",
  marginTop: "16px",
  fontFamily: "monospace",
};

const errorStyle: React.CSSProperties = {
  backgroundColor: "#FEF2F2",
  color: "#DC2626",
  padding: "12px",
  borderRadius: "6px",
  fontSize: "14px",
  marginTop: "16px",
};

const tableStyle: React.CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  fontSize: "14px",
};

const thStyle: React.CSSProperties = {
  textAlign: "left",
  padding: "10px 12px",
  backgroundColor: "#F9FAFB",
  borderBottom: "1px solid #E5E7EB",
  fontWeight: 500,
  color: "#374151",
};

const tdStyle: React.CSSProperties = {
  padding: "10px 12px",
  borderBottom: "1px solid #E5E7EB",
  color: "#111827",
};

const clickableRowStyle: React.CSSProperties = {
  cursor: "pointer",
};

const statusBadgeStyle = (completed: boolean): React.CSSProperties => ({
  display: "inline-block",
  padding: "2px 8px",
  borderRadius: "9999px",
  fontSize: "12px",
  fontWeight: 500,
  backgroundColor: completed ? "#D1FAE5" : "#FEF3C7",
  color: completed ? "#065F46" : "#92400E",
});

const detailsStyle: React.CSSProperties = {
  backgroundColor: "#F9FAFB",
  padding: "16px",
  borderRadius: "6px",
  marginTop: "16px",
  fontSize: "13px",
  fontFamily: "monospace",
  whiteSpace: "pre-wrap",
  wordBreak: "break-all",
  maxHeight: "400px",
  overflow: "auto",
};

const actionsStyle: React.CSSProperties = {
  display: "flex",
  gap: "8px",
  marginTop: "12px",
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
  padding: "32px",
  color: "#6B7280",
};

const loadingStyle: React.CSSProperties = {
  textAlign: "center",
  padding: "32px",
  color: "#6B7280",
};

const headerRowStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: "16px",
};

export function DebuggerPage() {
  const { contexts, isLoading, error: contextsError, refetch } = useContexts();
  const { workflows } = useWorkflows();

  const [subjectId, setSubjectId] = useState("");
  const [eventType, setEventType] = useState("");
  const [eventData, setEventData] = useState("{}");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<{ id: string; time: number } | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [expandedContext, setExpandedContext] = useState<string | null>(null);

  const workflowMap = new Map(workflows.map((w) => [w.id, w]));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitResult(null);
    setSubmitError(null);

    try {
      let parsedData = {};
      if (eventData.trim()) {
        try {
          parsedData = JSON.parse(eventData);
        } catch {
          throw new Error("Invalid JSON in event data");
        }
      }

      const result = await executeEvent(eventType, subjectId, parsedData);
      setSubmitResult({ id: result.event.id, time: result.event.time });
      refetch();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Failed to execute event");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteContext = async (
    subjectId: string,
    workflowId: string,
    instanceId: string
  ) => {
    if (!confirm("Are you sure you want to delete this context?")) return;

    try {
      await deleteContext(subjectId, workflowId, instanceId);
      setExpandedContext(null);
      refetch();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete context");
    }
  };

  const getContextKey = (ctx: { workflowId: string; instanceId: string }) =>
    `${ctx.workflowId}-${ctx.instanceId}`;

  return (
    <div style={pageStyle}>
      <header style={headerStyle}>
        <h1 style={titleStyle}>Debugger</h1>
      </header>

      <div style={gridStyle}>
        <div style={sectionStyle}>
          <h2 style={sectionTitleStyle}>Event Creator</h2>
          <form onSubmit={handleSubmit}>
            <div style={formGroupStyle}>
              <label style={labelStyle}>Subject ID</label>
              <input
                type="text"
                style={inputStyle}
                value={subjectId}
                onChange={(e) => setSubjectId(e.target.value)}
                placeholder="e.g., user-123"
                required
              />
            </div>
            <div style={formGroupStyle}>
              <label style={labelStyle}>Event Type</label>
              <input
                type="text"
                style={inputStyle}
                value={eventType}
                onChange={(e) => setEventType(e.target.value)}
                placeholder="e.g., user_signup"
                required
              />
            </div>
            <div style={formGroupStyle}>
              <label style={labelStyle}>Event Data (JSON)</label>
              <textarea
                style={textareaStyle}
                value={eventData}
                onChange={(e) => setEventData(e.target.value)}
                placeholder='{"key": "value"}'
              />
            </div>
            <button
              type="submit"
              style={isSubmitting ? buttonDisabledStyle : buttonStyle}
              disabled={isSubmitting}
            >
              {isSubmitting ? "Sending..." : "Send Event"}
            </button>
          </form>

          {submitResult && (
            <div style={successStyle}>
              Event sent successfully!
              {"\n"}ID: {submitResult.id}
              {"\n"}Time: {new Date(submitResult.time).toISOString()}
            </div>
          )}

          {submitError && <div style={errorStyle}>{submitError}</div>}
        </div>

        <div style={sectionStyle}>
          <div style={headerRowStyle}>
            <h2 style={sectionTitleStyle}>Workflow Instances</h2>
            <button style={secondaryButtonStyle} onClick={refetch}>
              Refresh
            </button>
          </div>

          {contextsError && (
            <div style={errorStyle}>Error: {contextsError.message}</div>
          )}

          {isLoading ? (
            <div style={loadingStyle}>Loading contexts...</div>
          ) : contexts.length === 0 ? (
            <div style={emptyStyle}>
              No workflow instances yet. Send an event to start a workflow.
            </div>
          ) : (
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>Workflow</th>
                  <th style={thStyle}>Subject ID</th>
                  <th style={thStyle}>Current Node</th>
                  <th style={thStyle}>Status</th>
                </tr>
              </thead>
              <tbody>
                {contexts.map((ctx) => {
                  const key = getContextKey(ctx);
                  const workflow = workflowMap.get(ctx.workflowId);
                  const isExpanded = expandedContext === key;

                  return (
                    <React.Fragment key={key}>
                      <tr
                        style={clickableRowStyle}
                        onClick={() =>
                          setExpandedContext(isExpanded ? null : key)
                        }
                      >
                        <td style={tdStyle}>
                          <Link
                            to={`/workflows/${ctx.workflowId}`}
                            style={{ textDecoration: "none", color: "inherit" }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div style={{ fontWeight: 500, color: "#3B82F6" }}>
                              {workflow?.name || "Unknown"}
                            </div>
                            <div
                              style={{
                                fontSize: "11px",
                                color: "#9CA3AF",
                                fontFamily: "monospace",
                              }}
                            >
                              {ctx.workflowId}
                            </div>
                          </Link>
                        </td>
                        <td style={tdStyle}>{ctx.subjectId}</td>
                        <td style={{ ...tdStyle, fontFamily: "monospace" }}>
                          {ctx.currentNodeId || "-"}
                        </td>
                        <td style={tdStyle}>
                          <span style={statusBadgeStyle(ctx.isCompleted ?? false)}>
                            {ctx.isCompleted ? "Completed" : "Active"}
                          </span>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr>
                          <td colSpan={4} style={{ padding: "0 12px 16px" }}>
                            <div style={detailsStyle}>
                              {JSON.stringify(ctx, null, 2)}
                            </div>
                            <div style={actionsStyle}>
                              <button
                                style={deleteButtonStyle}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteContext(
                                    ctx.subjectId,
                                    ctx.workflowId,
                                    ctx.instanceId
                                  );
                                }}
                              >
                                Delete Instance
                              </button>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
