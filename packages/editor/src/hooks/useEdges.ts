import { useMemo } from "react";
import type { Edge } from "@omega-flow/types";
import { useWorkflowEditorContext } from "../context/WorkflowEditorContext";
import { useTranslation } from "../i18n";
import type { TranslationFunction } from "../i18n/types";
import type { NodeTypeDefinition } from "../context/types";
import { resolveHandleLabel } from "../nodes/handles";

const labelBgStyle = {
  fill: "var(--of-edge-label-bg, #fff)",
  fillOpacity: 0.9,
};

const labelBgPadding: [number, number] = [4, 2];

/**
 * Names the branch an edge leaves from, e.g. the "False" output of a Condition
 * node, so a fork can be read off the canvas without tracing which dot each
 * line starts at. Branchless nodes stay unlabelled — a lone "Output" caption on
 * every edge would be noise.
 *
 * The label is derived for display only and never written back into the
 * workflow: `getWorkflow()` still serializes the untouched edges.
 */
function labelEdge(
  edge: Edge,
  nodeTypes: Map<string, NodeTypeDefinition>,
  nodeTypeById: Map<string, string | undefined>,
  t: TranslationFunction,
): Edge {
  // An edge that carries its own label was labelled deliberately; leave it.
  if (edge.label !== undefined || !edge.sourceHandle) return edge;

  const type = nodeTypeById.get(edge.source);
  const handles = type ? nodeTypes.get(type)?.sourceHandles : undefined;
  if (!handles || handles.length < 2) return edge;

  const handle = handles.find((h) => h.id === edge.sourceHandle);
  const label = handle && resolveHandleLabel(handle, t);
  if (!label) return edge;

  return {
    ...edge,
    label,
    labelStyle: {
      fill: handle.color ?? "var(--of-edge-label-color, #374151)",
      fontSize: "var(--of-edge-label-size, 11px)",
      fontWeight: "var(--of-font-weight-medium, 500)",
    },
    labelBgStyle,
    labelBgPadding,
    labelBgBorderRadius: 4,
  };
}

/**
 * Hook for working with edges in the workflow.
 * Returns edges and handlers compatible with ReactFlow.
 */
export function useEdges() {
  const context = useWorkflowEditorContext();
  const t = useTranslation();

  const { edges, nodes, nodeTypes } = context;

  const labelledEdges = useMemo(() => {
    const nodeTypeById = new Map(nodes.map((node) => [node.id, node.type]));
    return edges.map((edge) => labelEdge(edge, nodeTypes, nodeTypeById, t));
  }, [edges, nodes, nodeTypes, t]);

  return {
    edges: labelledEdges,
    onEdgesChange: context.onEdgesChange,
    onConnect: context.onConnect,
    addEdge: context.addEdge,
    removeEdge: context.removeEdge,
  };
}
