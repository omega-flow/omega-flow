import { useWorkflowEditorContext } from "../context/WorkflowEditorContext";

/**
 * Hook for working with nodes in the workflow.
 * Returns nodes and handlers compatible with ReactFlow.
 */
export function useNodes() {
  const context = useWorkflowEditorContext();

  return {
    nodes: context.nodes,
    onNodesChange: context.onNodesChange,
    addNode: context.addNode,
    updateNode: context.updateNode,
    removeNode: context.removeNode,
  };
}
