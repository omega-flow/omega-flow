import React, { useCallback, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ReactFlow, Background, Controls, Panel } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
// Import Omega Flow editor styles for theming support
import "@omega-flow/editor/styles.css";
// Uncomment to enable dark theme (also requires data-omega-flow-theme="dark" on a wrapper)
// import "@omega-flow/editor/themes/dark.css";
import {
  WorkflowEditor,
  NodesPanel,
  OptionsPanel,
  DetailPanel,
  ControlPanel,
  useNodes,
  useEdges,
  useNodeRegistry,
  useDragAndDrop,
  useWorkflowEditor,
  defaultNodeTypes,
} from "@omega-flow/editor";
import { useWorkflow } from "../hooks/useWorkflow";
import { useAutoSave } from "../hooks/useAutoSave";
import { updateWorkflow } from "../api/workflows";

const pageStyle: React.CSSProperties = {
  height: "calc(100vh - 52px)",
  display: "flex",
  flexDirection: "column",
};

const toolbarStyle: React.CSSProperties = {
  backgroundColor: "#fff",
  borderBottom: "1px solid #E5E7EB",
  padding: "8px 16px",
  display: "flex",
  alignItems: "center",
  gap: "16px",
};

const backLinkStyle: React.CSSProperties = {
  color: "#6B7280",
  textDecoration: "none",
  fontSize: "14px",
  display: "flex",
  alignItems: "center",
  gap: "4px",
};

const statusStyle: React.CSSProperties = {
  marginLeft: "auto",
  fontSize: "12px",
  color: "#6B7280",
};

const editorContainerStyle: React.CSSProperties = {
  flex: 1,
  position: "relative",
};

const loadingStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  height: "100%",
  color: "#6B7280",
};

const errorStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  height: "100%",
  color: "#DC2626",
  flexDirection: "column",
  gap: "16px",
};

function EditorCanvas() {
  const { nodes, onNodesChange } = useNodes();
  const { edges, onEdgesChange, onConnect } = useEdges();
  const { reactFlowNodeTypes } = useNodeRegistry();
  const { onDragOver, onDrop } = useDragAndDrop();
  const { getWorkflow, isDirty, markClean } = useWorkflowEditor();
  const [saveStatus, setSaveStatus] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");

  // Auto-save hook
  useAutoSave(getWorkflow, isDirty, {
    onSaveStart: () => setSaveStatus("saving"),
    onSaveSuccess: () => {
      setSaveStatus("saved");
      markClean();
      setTimeout(() => setSaveStatus("idle"), 2000);
    },
    onSaveError: () => setSaveStatus("error"),
  });

  // Manual save handler
  const handleSave = useCallback(async () => {
    setSaveStatus("saving");
    try {
      await updateWorkflow(getWorkflow());
      markClean();
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 2000);
    } catch {
      setSaveStatus("error");
    }
  }, [getWorkflow, markClean]);

  return (
    <>
      <div style={toolbarStyle}>
        <Link to="/" style={backLinkStyle}>
          &larr; Back to Workflows
        </Link>
        <span style={statusStyle}>
          {saveStatus === "saving" && "Saving..."}
          {saveStatus === "saved" && "Saved"}
          {saveStatus === "error" && "Error saving"}
          {saveStatus === "idle" && isDirty && "Unsaved changes"}
        </span>
      </div>

      <div style={editorContainerStyle}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onDragOver={onDragOver}
          onDrop={onDrop}
          nodeTypes={reactFlowNodeTypes}
          fitView
          fitViewOptions={{ padding: 0.2 }}
        >
          <Background />
          <Controls />

          <Panel position="top-left">
            <NodesPanel />
          </Panel>

          <Panel position="top-right">
            <ControlPanel onSave={handleSave} />
          </Panel>

          <Panel position="bottom-left">
            <OptionsPanel />
          </Panel>

          <Panel position="bottom-right">
            <DetailPanel />
          </Panel>
        </ReactFlow>
      </div>
    </>
  );
}

export function WorkflowEditorPage() {
  const { workflowId } = useParams<{ workflowId: string }>();
  const { workflow, isLoading, error } = useWorkflow(workflowId!);

  if (isLoading) {
    return (
      <div style={pageStyle}>
        <div style={loadingStyle}>Loading workflow...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={pageStyle}>
        <div style={errorStyle}>
          <p>Error: {error.message}</p>
          <Link to="/" style={{ color: "#3B82F6" }}>
            Back to Workflows
          </Link>
        </div>
      </div>
    );
  }

  if (!workflow) {
    return (
      <div style={pageStyle}>
        <div style={errorStyle}>
          <p>Workflow not found</p>
          <Link to="/" style={{ color: "#3B82F6" }}>
            Back to Workflows
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div style={pageStyle}>
      <WorkflowEditor workflow={workflow} nodeTypes={defaultNodeTypes}>
        <EditorCanvas />
      </WorkflowEditor>
    </div>
  );
}
