import { useWorkflowEditorContext } from "../context/WorkflowEditorContext";

/**
 * Hook for working with the currently selected node.
 */
export function useSelectedNode() {
  const context = useWorkflowEditorContext();

  const selectedNode = context.selectedNodeId
    ? context.nodes.find((n) => n.id === context.selectedNodeId) ?? null
    : null;

  const nodeType = selectedNode?.type
    ? context.nodeTypes.get(selectedNode.type)
    : undefined;

  return {
    /** The currently selected node, or null if none */
    selectedNode,
    /** The ID of the selected node */
    selectedNodeId: context.selectedNodeId,
    /** The node type definition for the selected node */
    nodeType,
    /** Select a node by ID */
    selectNode: context.selectNode,
    /** Update the selected node's data */
    updateSelectedNode: (data: Record<string, unknown>) => {
      if (context.selectedNodeId) {
        context.updateNode(context.selectedNodeId, data);
      }
    },
    /** Remove the selected node */
    removeSelectedNode: () => {
      if (context.selectedNodeId) {
        context.removeNode(context.selectedNodeId);
      }
    },
  };
}
