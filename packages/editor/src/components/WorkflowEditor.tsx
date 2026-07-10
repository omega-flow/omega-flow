import React from "react";
import { ReactFlowProvider } from "@xyflow/react";
import { WorkflowEditorProvider } from "../context/WorkflowEditorContext";
import { TranslationProvider } from "../i18n";
import type { WorkflowEditorProps } from "../context/types";

/**
 * Main wrapper component for the workflow editor.
 * Provides context, state management, and translation for all child components.
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
  translationFn,
  translations,
  mode,
  layoutOptions,
}: WorkflowEditorProps) {
  return (
    <ReactFlowProvider>
      <TranslationProvider
        translationFn={translationFn}
        translations={translations}
      >
        <WorkflowEditorProvider
          workflow={workflow}
          nodeTypes={nodeTypes}
          onWorkflowChange={onWorkflowChange}
          onDirtyChange={onDirtyChange}
          mode={mode}
          layoutOptions={layoutOptions}
        >
          {children}
        </WorkflowEditorProvider>
      </TranslationProvider>
    </ReactFlowProvider>
  );
}
