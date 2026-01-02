import { useMemo } from "react";
import type { ComponentType } from "react";
import type { NodeProps, NodeTypes } from "@xyflow/react";
import { useWorkflowEditorContext } from "../context/WorkflowEditorContext";
import type { NodeTypeDefinition } from "../context/types";

/**
 * Hook for accessing the node type registry.
 * Returns node types and ReactFlow-compatible nodeTypes object.
 */
export function useNodeRegistry() {
  const context = useWorkflowEditorContext();

  // Create ReactFlow-compatible nodeTypes object
  const reactFlowNodeTypes = useMemo<NodeTypes>(() => {
    const types: NodeTypes = {};
    context.nodeTypes.forEach((def, type) => {
      types[type] = def.ViewComponent as ComponentType<NodeProps>;
    });
    return types;
  }, [context.nodeTypes]);

  // Get array of node type definitions
  const nodeTypesList = useMemo(
    () => Array.from(context.nodeTypes.values()),
    [context.nodeTypes]
  );

  return {
    /** Map of node type definitions */
    nodeTypes: context.nodeTypes,
    /** Array of node type definitions */
    nodeTypesList,
    /** ReactFlow-compatible nodeTypes object */
    reactFlowNodeTypes,
    /** Register a new node type */
    registerNodeType: context.registerNodeType,
    /** Get a specific node type definition */
    getNodeType: (type: string): NodeTypeDefinition | undefined =>
      context.nodeTypes.get(type),
  };
}
