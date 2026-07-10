import { useWorkflowEditorContext } from "../context/WorkflowEditorContext";

/**
 * Main hook for accessing workflow editor state and actions.
 * Provides a convenient interface to the most commonly used functionality.
 */
export function useWorkflowEditor() {
  const context = useWorkflowEditorContext();

  return {
    // State
    workflow: context.getWorkflow(),
    nodes: context.nodes,
    edges: context.edges,
    options: context.options,
    name: context.name,
    isDirty: context.isDirty,
    selectedNode: context.selectedNodeId
      ? context.nodes.find((n) => n.id === context.selectedNodeId) ?? null
      : null,
    selectedNodeId: context.selectedNodeId,
    mode: context.mode,

    // Actions
    loadWorkflow: context.loadWorkflow,
    resetWorkflow: context.resetWorkflow,
    addNode: context.addNode,
    updateNode: context.updateNode,
    removeNode: context.removeNode,
    selectNode: context.selectNode,
    addEdge: context.addEdge,
    removeEdge: context.removeEdge,
    setName: context.setName,
    setOptions: context.setOptions,
    getWorkflow: context.getWorkflow,
    markClean: context.markClean,
    setMode: context.setMode,
    insertNodeAfter: context.insertNodeAfter,
    insertNodeOnEdge: context.insertNodeOnEdge,
    autoLayout: context.autoLayout,
  };
}
