import { useCallback, useMemo } from "react";
import type { ComponentType } from "react";
import type {
  NodeProps,
  NodeTypes,
  EdgeTypes,
  NodeChange,
  EdgeChange,
} from "@xyflow/react";
import type { Node, Edge } from "@omega-flow/types";
import { useWorkflowEditorContext } from "../context/WorkflowEditorContext";
import {
  derivePlaceholders,
  type PlaceholderNodeData,
} from "../guided/placeholders";
import { AddNodePlaceholderView } from "../guided/AddNodePlaceholderView";
import { InsertableEdge } from "../guided/InsertableEdge";
import {
  PLACEHOLDER_NODE_TYPE,
  INSERTABLE_EDGE_TYPE,
  isPlaceholderId,
} from "../guided/constants";
import { layoutFlow } from "../utils/layout";

/**
 * One-stop hook for rendering a guided-mode canvas. Returns the flow
 * augmented with "Add node" placeholders, the node/edge type maps, and the
 * props to spread onto `<ReactFlow>`:
 *
 * ```tsx
 * const { nodes, edges, nodeTypes, edgeTypes, reactFlowProps } = useGuidedFlow();
 * return (
 *   <ReactFlow nodes={nodes} edges={edges} nodeTypes={nodeTypes}
 *              edgeTypes={edgeTypes} {...reactFlowProps}>
 *     <NodeChooser />
 *   </ReactFlow>
 * );
 * ```
 *
 * When the editor is in freeform mode the hook degrades to a plain
 * pass-through (no placeholders, standard handlers), so a single canvas can
 * spread its result in both modes.
 */
export function useGuidedFlow() {
  const context = useWorkflowEditorContext();
  const {
    nodes,
    edges,
    nodeTypes,
    mode,
    layoutOptions,
    onNodesChange,
    onEdgesChange,
    onConnect,
    requestInsertion,
  } = context;
  const isGuided = mode === "guided";

  // Node/edge component registries, including the guided-mode extras
  const reactFlowNodeTypes = useMemo<NodeTypes>(() => {
    const types: NodeTypes = {};
    nodeTypes.forEach((def, type) => {
      types[type] = def.ViewComponent as ComponentType<NodeProps>;
    });
    types[PLACEHOLDER_NODE_TYPE] = AddNodePlaceholderView;
    return types;
  }, [nodeTypes]);

  const reactFlowEdgeTypes = useMemo<EdgeTypes>(
    () => ({ [INSERTABLE_EDGE_TYPE]: InsertableEdge }),
    []
  );

  // Augmented flow: real nodes + derived placeholders, laid out together so
  // placeholders take part in the spacing and never overlap real nodes.
  const augmented = useMemo(() => {
    if (!isGuided) return { nodes, edges };

    const placeholders = derivePlaceholders(nodes, edges, nodeTypes);
    const allNodes = [...nodes, ...placeholders.nodes];
    const allEdges = [
      ...edges.map(
        (edge): Edge => ({
          ...edge,
          type: INSERTABLE_EDGE_TYPE,
          selectable: false,
        })
      ),
      ...placeholders.edges.map(
        (edge): Edge => ({ ...edge, type: INSERTABLE_EDGE_TYPE, selectable: false })
      ),
    ];
    return {
      nodes: layoutFlow(allNodes, allEdges, nodeTypes, layoutOptions),
      edges: allEdges,
    };
  }, [isGuided, nodes, edges, nodeTypes, layoutOptions]);

  // Placeholders are virtual: changes ReactFlow emits for them (dimensions,
  // selection) must never reach the editor state.
  const handleNodesChange = useCallback(
    (changes: unknown[]) => {
      if (!isGuided) {
        onNodesChange(changes);
        return;
      }
      const filtered = (changes as NodeChange[]).filter(
        (change) => !("id" in change && isPlaceholderId(change.id))
      );
      if (filtered.length > 0) onNodesChange(filtered);
    },
    [isGuided, onNodesChange]
  );

  const handleEdgesChange = useCallback(
    (changes: unknown[]) => {
      if (!isGuided) {
        onEdgesChange(changes);
        return;
      }
      const filtered = (changes as EdgeChange[]).filter(
        (change) => !("id" in change && isPlaceholderId(change.id))
      );
      if (filtered.length > 0) onEdgesChange(filtered);
    },
    [isGuided, onEdgesChange]
  );

  // Placeholder clicks open the node chooser. Handled at the ReactFlow level
  // (not only inside the placeholder view) so clicks work regardless of how
  // the node's inner DOM handles events.
  const handleNodeClick = useCallback(
    (_event: unknown, node: { id: string; data?: unknown }) => {
      if (!isPlaceholderId(node.id)) return;
      const insertion = (node.data as PlaceholderNodeData | undefined)
        ?.insertion;
      if (insertion) requestInsertion(insertion);
    },
    [requestInsertion]
  );

  const reactFlowProps = useMemo(
    () =>
      isGuided
        ? {
            onNodesChange: handleNodesChange,
            onEdgesChange: handleEdgesChange,
            onNodeClick: handleNodeClick,
            // Guided mode owns connections and positions
            nodesConnectable: false,
            nodesDraggable: false,
            edgesFocusable: false,
          }
        : {
            onNodesChange: handleNodesChange,
            onEdgesChange: handleEdgesChange,
            onConnect,
          },
    [isGuided, handleNodesChange, handleEdgesChange, handleNodeClick, onConnect]
  );

  return {
    /** Nodes to render (real nodes plus derived placeholders in guided mode) */
    nodes: augmented.nodes as Node[],
    /** Edges to render (typed for the insertable edge in guided mode) */
    edges: augmented.edges as Edge[],
    /** ReactFlow `nodeTypes` map including the placeholder view */
    nodeTypes: reactFlowNodeTypes,
    /** ReactFlow `edgeTypes` map with the insertable edge */
    edgeTypes: reactFlowEdgeTypes,
    /** Props to spread onto `<ReactFlow>` */
    reactFlowProps,
    /** Current editor mode */
    mode,
    /** Convenience flag */
    isGuided,
  };
}
