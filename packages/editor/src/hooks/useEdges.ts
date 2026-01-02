import { useWorkflowEditorContext } from "../context/WorkflowEditorContext";

/**
 * Hook for working with edges in the workflow.
 * Returns edges and handlers compatible with ReactFlow.
 */
export function useEdges() {
  const context = useWorkflowEditorContext();

  return {
    edges: context.edges,
    onEdgesChange: context.onEdgesChange,
    onConnect: context.onConnect,
    addEdge: context.addEdge,
    removeEdge: context.removeEdge,
  };
}
