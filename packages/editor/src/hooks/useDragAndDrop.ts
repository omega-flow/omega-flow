import { useCallback } from "react";
import { useReactFlow } from "@xyflow/react";
import { useWorkflowEditorContext } from "../context/WorkflowEditorContext";

/**
 * Hook for handling drag-and-drop from the nodes panel to the canvas.
 * Provides event handlers for drag start, drag over, and drop events.
 */
export function useDragAndDrop() {
  const { addNode } = useWorkflowEditorContext();
  const reactFlowInstance = useReactFlow();

  /**
   * Start dragging a node type from the panel.
   * Call this in onDragStart of your draggable element.
   */
  const onDragStart = useCallback(
    (event: React.DragEvent, nodeType: string) => {
      event.dataTransfer.setData("application/reactflow", nodeType);
      event.dataTransfer.effectAllowed = "move";
    },
    []
  );

  /**
   * Handle dragging over the canvas.
   * Pass this to onDragOver on your ReactFlow component.
   */
  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  /**
   * Handle dropping a node onto the canvas.
   * Pass this to onDrop on your ReactFlow component.
   */
  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const type = event.dataTransfer.getData("application/reactflow");
      if (!type) return;

      // Convert screen coordinates to flow coordinates
      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      addNode(type, position);
    },
    [addNode, reactFlowInstance]
  );

  return {
    onDragStart,
    onDragOver,
    onDrop,
  };
}
