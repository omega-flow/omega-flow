import React from "react";
import { ReactFlowProvider } from "@xyflow/react";
import { WorkflowEditorProvider } from "../context/WorkflowEditorContext";
import type { WorkflowEditorProps } from "../context/types";

/**
 * Main wrapper component for the workflow editor.
 * Provides context and state management for all child components.
 *
 * @example
 * ```tsx
 * <WorkflowEditor workflow={workflow} onWorkflowChange={handleChange}>
 *   <ReactFlow nodes={nodes} edges={edges} ...>
 *     <Panel position="top-left"><NodesPanel /></Panel>
 *   </ReactFlow>
 * </WorkflowEditor>
 * ```
 */
export function WorkflowEditor({
  children,
  workflow,
  nodeTypes,
  onWorkflowChange,
  onDirtyChange,
}: WorkflowEditorProps) {
  return (
    <ReactFlowProvider>
      <WorkflowEditorProvider
        workflow={workflow}
        nodeTypes={nodeTypes}
        onWorkflowChange={onWorkflowChange}
        onDirtyChange={onDirtyChange}
      >
        {children}
      </WorkflowEditorProvider>
    </ReactFlowProvider>
  );
}
