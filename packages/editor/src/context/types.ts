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
 * Editing style of the workflow editor.
 * - `freeform`: classic drag-and-drop; the user places nodes and draws connections.
 * - `guided`: step-by-step; unconnected outputs show "Add node" placeholders,
 *   layout is automatic, and connections are managed by the editor.
 */
export type EditorMode = "freeform" | "guided";

/**
 * Role of a node type in guided mode.
 * - `trigger`: entry point; only offered when the canvas is empty.
 * - `flow`: regular mid-flow node (default).
 * - `terminal`: ends the flow; has no outputs, so no placeholder follows it.
 */
export type NodeRole = "trigger" | "flow" | "terminal";

/**
 * Where a pending node insertion will happen (drives the NodeChooser).
 */
export type PendingInsertion =
  | { kind: "root" }
  | { kind: "after"; sourceNodeId: string; sourceHandleId?: string }
  | { kind: "edge"; edgeId: string };

/**
 * Options for the automatic layout used in guided mode (and `autoLayout()`).
 */
export interface LayoutOptions {
  /** Layout direction: top-to-bottom (default) or left-to-right */
  direction?: "TB" | "LR";
  /** Gap between ranks (vertical in TB), in px. Default 60. */
  rankGap?: number;
  /** Gap between siblings (horizontal in TB), in px. Default 40. */
  nodeGap?: number;
  /** Fallback node width when not yet measured. Default 180. */
  nodeWidth?: number;
  /** Fallback node height when not yet measured. Default 70. */
  nodeHeight?: number;
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
  /** Display name shown in UI. Used as a fallback when {@link labelKey} is unset or has no registered translation. */
  label: string;
  /**
   * Optional translation key for the display name. When set, the `NodesPanel`
   * resolves the label through the editor's translation function, falling back
   * to {@link label} when no translation is registered for the key.
   */
  labelKey?: string;
  /** Description/tooltip text. Used as a fallback when {@link descriptionKey} is unset or has no registered translation. */
  description?: string;
  /**
   * Optional translation key for the description. When set, the `NodesPanel`
   * resolves the description through the editor's translation function, falling
   * back to {@link description} when no translation is registered for the key.
   */
  descriptionKey?: string;
  /** Icon component to display in NodesPanel */
  Icon?: ComponentType<{ size?: number }>;
  /** Initial data when node is created */
  defaultData: Record<string, unknown>;
  /** Component to render on the canvas */
  ViewComponent: ComponentType<NodeViewProps>;
  /** Component to render in the detail panel */
  DetailComponent: ComponentType<NodeDetailProps>;
  /**
   * Source handles (outputs) this node type exposes. Used by guided mode to
   * place an "Add node" placeholder after each unconnected output without
   * rendering the node. Defaults to a single `{ id: "output" }` handle
   * (`role: "terminal"` types default to none). Should match the handles the
   * `ViewComponent` renders.
   */
  sourceHandles?: HandleDefinition[];
  /**
   * Role of this node type in guided mode. `trigger` types are only offered
   * for an empty canvas, `terminal` types have no outputs. Defaults to `flow`.
   */
  role?: NodeRole;
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
  /** Current editing style */
  mode: EditorMode;
  /** Pending insertion awaiting a node type choice (guided mode), or null */
  pendingInsertion: PendingInsertion | null;
  /** Options for automatic layout */
  layoutOptions: LayoutOptions;
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

  /** Switch between freeform and guided editing */
  setMode: (mode: EditorMode) => void;
  /**
   * Insert a new node connected after `sourceNodeId` (from `sourceHandleId`).
   * In guided mode the flow is re-laid out automatically.
   */
  insertNodeAfter: (
    sourceNodeId: string,
    sourceHandleId: string | undefined,
    type: string
  ) => void;
  /**
   * Insert a new node in the middle of an existing edge: A→C becomes A→B→C.
   * The new node's first source handle inherits the downstream connection.
   */
  insertNodeOnEdge: (edgeId: string, type: string) => void;
  /** Recompute all node positions with the automatic layout */
  autoLayout: () => void;
  /** Open the node chooser for the given insertion point (null closes it) */
  requestInsertion: (insertion: PendingInsertion | null) => void;

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
   * Editing style: classic `freeform` drag-and-drop (default) or `guided`
   * step-by-step building with "Add node" placeholders and automatic layout.
   * Can be changed at runtime via the `setMode` action.
   */
  mode?: EditorMode;
  /** Options for the automatic layout used in guided mode and `autoLayout()` */
  layoutOptions?: LayoutOptions;
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
