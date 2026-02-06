import type { ReactNode, ComponentType } from "react";
import type { Node, Edge, Workflow, WorkflowOptions } from "@omega-flow/types";
import type { NodeProps } from "@xyflow/react";
import type { TranslationFunction, TranslationDictionary } from "../i18n/types";

/**
 * Definition for a handle (connection point) on a node
 */
export interface HandleDefinition {
  id: string;
  label?: string;
}

/**
 * Props passed to node view components (rendered on canvas)
 * This extends ReactFlow's NodeProps for full compatibility
 */
export type NodeViewProps = NodeProps;

/**
 * Props passed to node detail components (rendered in detail panel)
 */
export interface NodeDetailProps {
  node: Node;
  onChange: (data: Record<string, unknown>) => void;
}

/**
 * Complete definition of a node type including visual components
 */
export interface NodeTypeDefinition {
  /** Node type identifier (e.g., "Trigger", "Action") */
  type: string;
  /** Display name shown in UI */
  label: string;
  /** Description/tooltip text */
  description?: string;
  /** Icon component to display in NodesPanel */
  Icon?: ComponentType<{ size?: number }>;
  /** Initial data when node is created */
  defaultData: Record<string, unknown>;
  /** Component to render on the canvas */
  ViewComponent: ComponentType<NodeViewProps>;
  /** Component to render in the detail panel */
  DetailComponent: ComponentType<NodeDetailProps>;
}

/**
 * State managed by the workflow editor context
 */
export interface WorkflowEditorState {
  /** The original workflow being edited (null if creating new) */
  workflow: Workflow | null;
  /** Current nodes in the flow */
  nodes: Node[];
  /** Current edges in the flow */
  edges: Edge[];
  /** Workflow options (frequency, etc.) */
  options: WorkflowOptions;
  /** Workflow name */
  name: string;
  /** Currently selected node ID */
  selectedNodeId: string | null;
  /** Whether there are unsaved changes */
  isDirty: boolean;
  /** Registered node types */
  nodeTypes: Map<string, NodeTypeDefinition>;
}

/**
 * Actions available in the workflow editor context
 */
export interface WorkflowEditorActions {
  /** Load a workflow into the editor */
  loadWorkflow: (workflow: Workflow) => void;
  /** Reset to initial state */
  resetWorkflow: () => void;

  /** Add a new node at position */
  addNode: (type: string, position: { x: number; y: number }) => void;
  /** Update a node's data */
  updateNode: (nodeId: string, data: Record<string, unknown>) => void;
  /** Update a node's position */
  updateNodePosition: (nodeId: string, position: { x: number; y: number }) => void;
  /** Remove a node */
  removeNode: (nodeId: string) => void;
  /** Select a node (or null to deselect) */
  selectNode: (nodeId: string | null) => void;

  /** Add a new edge */
  addEdge: (connection: {
    source: string;
    target: string;
    sourceHandle?: string;
    targetHandle?: string;
  }) => void;
  /** Remove an edge */
  removeEdge: (edgeId: string) => void;

  /** Set workflow name */
  setName: (name: string) => void;
  /** Set workflow options */
  setOptions: (options: WorkflowOptions) => void;

  /** Register a custom node type */
  registerNodeType: (definition: NodeTypeDefinition) => void;

  /** Get the current workflow state */
  getWorkflow: () => Workflow;
  /** Mark the workflow as clean (saved) */
  markClean: () => void;

  /** Handle ReactFlow node changes */
  onNodesChange: (changes: unknown[]) => void;
  /** Handle ReactFlow edge changes */
  onEdgesChange: (changes: unknown[]) => void;
  /** Handle ReactFlow connections */
  onConnect: (connection: unknown) => void;
}

/**
 * Complete context value combining state and actions
 */
export interface WorkflowEditorContextValue
  extends WorkflowEditorState,
    WorkflowEditorActions {}

/**
 * Props for the WorkflowEditor component
 */
export interface WorkflowEditorProps {
  children: ReactNode;
  /** Initial workflow to load */
  workflow?: Workflow;
  /** Custom node types to register */
  nodeTypes?: NodeTypeDefinition[];
  /** Callback when workflow changes */
  onWorkflowChange?: (workflow: Workflow) => void;
  /** Callback when dirty state changes */
  onDirtyChange?: (isDirty: boolean) => void;
  /**
   * Custom translation function that fully replaces the built-in resolver.
   * Use this to plug in any i18n library (i18next, react-intl, etc.).
   *
   * ```tsx
   * <WorkflowEditor translationFn={(key, params) => i18n.t(key, params)}>
   * ```
   *
   * Takes precedence over `translations` if both are provided.
   */
  translationFn?: TranslationFunction;
  /**
   * Flat dictionary merged on top of default English strings.
   * Use this for simple overrides or full translations without an external i18n library.
   *
   * ```tsx
   * <WorkflowEditor translations={{ "panels.control.title": "Flujo" }}>
   * ```
   *
   * Ignored when `translationFn` is provided.
   */
  translations?: TranslationDictionary;
}

/**
 * Props for NodesPanel component
 */
export interface NodesPanelProps {
  className?: string;
  /** Whether to show descriptions */
  showDescriptions?: boolean;
  /** Filter which node types to show */
  filter?: (nodeType: NodeTypeDefinition) => boolean;
  /** Custom render function for items */
  renderItem?: (nodeType: NodeTypeDefinition) => ReactNode;
}

/**
 * Props for DetailPanel component
 */
export interface DetailPanelProps {
  className?: string;
  /** Message when no node is selected */
  emptyMessage?: ReactNode;
  /** Whether to show node type label */
  showNodeType?: boolean;
  /** Whether to show node ID */
  showNodeId?: boolean;
}

/**
 * Props for OptionsPanel component
 */
export interface OptionsPanelProps {
  className?: string;
  /** Whether to show frequency options */
  showFrequency?: boolean;
  /** Custom options to render */
  customOptions?: ReactNode;
}

/**
 * Props for ControlPanel component
 */
export interface ControlPanelProps {
  className?: string;
  /** Whether to show name input */
  showName?: boolean;
  /** Whether to show save button */
  showSaveButton?: boolean;
  /** Label for save button */
  saveButtonLabel?: string;
  /** Save callback */
  onSave?: () => Promise<void>;
  /** Custom actions to render */
  renderActions?: (context: { isDirty: boolean; workflow: Workflow }) => ReactNode;
}
