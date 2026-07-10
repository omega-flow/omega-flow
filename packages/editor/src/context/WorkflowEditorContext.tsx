import React, {
  createContext,
  useContext,
  useReducer,
  useCallback,
  useMemo,
  useEffect,
} from "react";
import type { Node, Edge, Workflow, WorkflowOptions } from "@omega-flow/types";
import {
  applyNodeChanges,
  applyEdgeChanges,
  type NodeChange,
  type EdgeChange,
  type Connection,
} from "@xyflow/react";
import type {
  WorkflowEditorContextValue,
  WorkflowEditorState,
  NodeTypeDefinition,
  WorkflowEditorProps,
  EditorMode,
  PendingInsertion,
  LayoutOptions,
} from "./types";
import { defaultNodeTypes } from "../nodes";
import { generateNodeId, generateEdgeId } from "../utils/ids";
import {
  insertNodeAfter as insertNodeAfterGraph,
  insertNodeOnEdge as insertNodeOnEdgeGraph,
  removeNodeWithHealing,
  getSourceHandles,
} from "../utils/graph";
import { layoutFlow } from "../utils/layout";

// Action types for reducer
type Action =
  | { type: "LOAD_WORKFLOW"; payload: Workflow }
  | { type: "RESET_WORKFLOW" }
  | { type: "SET_NODES"; payload: Node[] }
  | { type: "SET_EDGES"; payload: Edge[] }
  | { type: "ADD_NODE"; payload: Node }
  | { type: "UPDATE_NODE"; payload: { nodeId: string; data: Record<string, unknown> } }
  | { type: "UPDATE_NODE_POSITION"; payload: { nodeId: string; position: { x: number; y: number } } }
  | { type: "REMOVE_NODE"; payload: string }
  | { type: "SELECT_NODE"; payload: string | null }
  | { type: "ADD_EDGE"; payload: Edge }
  | { type: "REMOVE_EDGE"; payload: string }
  | { type: "SET_NAME"; payload: string }
  | { type: "SET_OPTIONS"; payload: WorkflowOptions }
  | { type: "REGISTER_NODE_TYPE"; payload: NodeTypeDefinition }
  | { type: "MARK_CLEAN" }
  | { type: "APPLY_NODE_CHANGES"; payload: NodeChange[] }
  | { type: "APPLY_EDGE_CHANGES"; payload: EdgeChange[] }
  | { type: "SET_MODE"; payload: EditorMode }
  | { type: "SET_PENDING_INSERTION"; payload: PendingInsertion | null }
  | {
      type: "INSERT_NODE_AFTER";
      payload: { node: Node; sourceNodeId: string; sourceHandleId?: string };
    }
  | {
      type: "INSERT_NODE_ON_EDGE";
      payload: { node: Node; edgeId: string; nodeSourceHandleId?: string };
    }
  | { type: "AUTO_LAYOUT" };

function findSelectedNodeId(nodes: Node[]): string | null {
  return nodes.find((n) => (n as Node & { selected?: boolean }).selected)?.id ?? null;
}

function createInitialState(
  workflow?: Workflow,
  nodeTypes?: NodeTypeDefinition[],
  mode?: EditorMode,
  layoutOptions?: LayoutOptions
): WorkflowEditorState {
  // Use provided node types, or fall back to defaults if none provided
  const nodeTypesMap = new Map<string, NodeTypeDefinition>();
  const typesToUse = nodeTypes ?? defaultNodeTypes;
  typesToUse.forEach((def) => nodeTypesMap.set(def.type, def));

  const common = {
    mode: mode ?? ("freeform" as EditorMode),
    pendingInsertion: null,
    layoutOptions: layoutOptions ?? {},
    nodeTypes: nodeTypesMap,
    isDirty: false,
  };

  if (workflow) {
    return {
      ...common,
      workflow,
      nodes: workflow.flow.nodes,
      edges: workflow.flow.edges,
      options: workflow.options,
      name: workflow.name,
      selectedNodeId: findSelectedNodeId(workflow.flow.nodes),
    };
  }

  return {
    ...common,
    workflow: null,
    nodes: [],
    edges: [],
    options: { frequency: { type: "one_time" } },
    name: "",
    selectedNodeId: null,
  };
}

/** Re-layout nodes when in guided mode; identity otherwise. */
function withAutoLayout(state: WorkflowEditorState): WorkflowEditorState {
  if (state.mode !== "guided") return state;
  return {
    ...state,
    nodes: layoutFlow(
      state.nodes,
      state.edges,
      state.nodeTypes,
      state.layoutOptions
    ),
  };
}

/** Marks `node` as the only selected node in the list. */
function selectOnly(nodes: Node[], nodeId: string): Node[] {
  return nodes.map((node) => ({ ...node, selected: node.id === nodeId }));
}

/** Applies ReactFlow node changes (positions, selection, removals) to state. */
function applyNodeChangesToState(
  state: WorkflowEditorState,
  changes: NodeChange[]
): WorkflowEditorState {
  const newNodes = applyNodeChanges(changes, state.nodes);
  // Check for selection changes
  // Process selections first, then deselections, to handle the case where
  // ReactFlow sends deselect of old node after select of new node
  let newSelectedId = state.selectedNodeId;

  // First pass: handle selections (new node being selected)
  for (const change of changes) {
    if (change.type === "select" && change.selected) {
      newSelectedId = change.id;
    }
  }

  // Second pass: handle deselections and removals
  for (const change of changes) {
    if (
      change.type === "select" &&
      !change.selected &&
      change.id === newSelectedId
    ) {
      // Only clear selection if the deselected node is still the selected one
      newSelectedId = null;
    } else if (change.type === "remove" && change.id === newSelectedId) {
      newSelectedId = null;
    }
  }
  // Only mark dirty for position/data changes, not selections
  const hasDirtyChange = changes.some(
    (c) => c.type === "position" || c.type === "dimensions" || c.type === "remove"
  );
  return {
    ...state,
    nodes: newNodes,
    selectedNodeId: newSelectedId,
    isDirty: state.isDirty || hasDirtyChange,
  };
}

function reducer(state: WorkflowEditorState, action: Action): WorkflowEditorState {
  switch (action.type) {
    case "LOAD_WORKFLOW": {
      const workflow = action.payload;
      // In guided mode positions are always the automatic layout's
      return withAutoLayout({
        ...state,
        workflow,
        nodes: workflow.flow.nodes,
        edges: workflow.flow.edges,
        options: workflow.options,
        name: workflow.name,
        selectedNodeId: findSelectedNodeId(workflow.flow.nodes),
        pendingInsertion: null,
        isDirty: false,
      });
    }

    case "RESET_WORKFLOW": {
      if (state.workflow) {
        return {
          ...state,
          nodes: state.workflow.flow.nodes,
          edges: state.workflow.flow.edges,
          options: state.workflow.options,
          name: state.workflow.name,
          selectedNodeId: findSelectedNodeId(state.workflow.flow.nodes),
          isDirty: false,
        };
      }
      return {
        ...state,
        nodes: [],
        edges: [],
        options: { frequency: { type: "one_time" } },
        name: "",
        selectedNodeId: null,
        isDirty: false,
      };
    }

    case "SET_NODES":
      return { ...state, nodes: action.payload, isDirty: true };

    case "SET_EDGES":
      return { ...state, edges: action.payload, isDirty: true };

    case "ADD_NODE": {
      if (state.mode === "guided") {
        // Guided adds (e.g. the first trigger) are laid out and selected
        return withAutoLayout({
          ...state,
          nodes: selectOnly([...state.nodes, action.payload], action.payload.id),
          selectedNodeId: action.payload.id,
          pendingInsertion: null,
          isDirty: true,
        });
      }
      return {
        ...state,
        nodes: [...state.nodes, action.payload],
        isDirty: true,
      };
    }

    case "UPDATE_NODE": {
      const { nodeId, data } = action.payload;
      return {
        ...state,
        nodes: state.nodes.map((node) =>
          node.id === nodeId ? { ...node, data: { ...node.data, ...data } } : node
        ),
        isDirty: true,
      };
    }

    case "UPDATE_NODE_POSITION": {
      const { nodeId, position } = action.payload;
      return {
        ...state,
        nodes: state.nodes.map((node) =>
          node.id === nodeId ? { ...node, position } : node
        ),
        isDirty: true,
      };
    }

    case "REMOVE_NODE": {
      const nodeId = action.payload;
      if (state.mode === "guided") {
        // Heal the flow around the removed node (A→B→C becomes A→C)
        const healed = removeNodeWithHealing(
          { nodes: state.nodes, edges: state.edges },
          nodeId
        );
        return withAutoLayout({
          ...state,
          nodes: healed.nodes,
          edges: healed.edges,
          selectedNodeId:
            state.selectedNodeId &&
            healed.nodes.some((n) => n.id === state.selectedNodeId)
              ? state.selectedNodeId
              : null,
          isDirty: true,
        });
      }
      return {
        ...state,
        nodes: state.nodes.filter((node) => node.id !== nodeId),
        edges: state.edges.filter(
          (edge) => edge.source !== nodeId && edge.target !== nodeId
        ),
        selectedNodeId: state.selectedNodeId === nodeId ? null : state.selectedNodeId,
        isDirty: true,
      };
    }

    case "SELECT_NODE":
      return { ...state, selectedNodeId: action.payload };

    case "ADD_EDGE":
      return {
        ...state,
        edges: [...state.edges, action.payload],
        isDirty: true,
      };

    case "REMOVE_EDGE":
      return {
        ...state,
        edges: state.edges.filter((edge) => edge.id !== action.payload),
        isDirty: true,
      };

    case "SET_NAME":
      return { ...state, name: action.payload, isDirty: true };

    case "SET_OPTIONS":
      return { ...state, options: action.payload, isDirty: true };

    case "REGISTER_NODE_TYPE": {
      const newNodeTypes = new Map(state.nodeTypes);
      newNodeTypes.set(action.payload.type, action.payload);
      return { ...state, nodeTypes: newNodeTypes };
    }

    case "MARK_CLEAN":
      return { ...state, isDirty: false };

    case "SET_MODE": {
      const next: WorkflowEditorState = {
        ...state,
        mode: action.payload,
        pendingInsertion: null,
      };
      // Entering guided mode adopts the automatic layout right away
      return action.payload === "guided" ? withAutoLayout(next) : next;
    }

    case "SET_PENDING_INSERTION":
      return { ...state, pendingInsertion: action.payload };

    case "INSERT_NODE_AFTER": {
      const { node, sourceNodeId, sourceHandleId } = action.payload;
      const inserted = insertNodeAfterGraph(
        { nodes: state.nodes, edges: state.edges },
        sourceNodeId,
        sourceHandleId,
        node
      );
      return withAutoLayout({
        ...state,
        nodes: selectOnly(inserted.nodes, node.id),
        edges: inserted.edges,
        selectedNodeId: node.id,
        pendingInsertion: null,
        isDirty: true,
      });
    }

    case "INSERT_NODE_ON_EDGE": {
      const { node, edgeId, nodeSourceHandleId } = action.payload;
      const inserted = insertNodeOnEdgeGraph(
        { nodes: state.nodes, edges: state.edges },
        edgeId,
        node,
        nodeSourceHandleId
      );
      if (inserted.nodes === state.nodes) {
        return { ...state, pendingInsertion: null };
      }
      return withAutoLayout({
        ...state,
        nodes: selectOnly(inserted.nodes, node.id),
        edges: inserted.edges,
        selectedNodeId: node.id,
        pendingInsertion: null,
        isDirty: true,
      });
    }

    case "AUTO_LAYOUT":
      return {
        ...state,
        nodes: layoutFlow(
          state.nodes,
          state.edges,
          state.nodeTypes,
          state.layoutOptions
        ),
        isDirty: true,
      };

    case "APPLY_NODE_CHANGES": {
      if (state.mode === "guided") {
        // Route removals (delete key) through healing, and re-run the layout
        // once ReactFlow reports measured node sizes.
        const removals = action.payload.filter((c) => c.type === "remove");
        const rest = action.payload.filter((c) => c.type !== "remove");
        let next = state;
        for (const removal of removals) {
          next = reducer(next, { type: "REMOVE_NODE", payload: removal.id });
        }
        if (rest.length > 0) {
          next = applyNodeChangesToState(next, rest);
          if (rest.some((c) => c.type === "dimensions")) {
            next = withAutoLayout(next);
          }
        }
        return next;
      }
      return applyNodeChangesToState(state, action.payload);
    }

    case "APPLY_EDGE_CHANGES": {
      // Guided mode owns the edges: connections can never be deleted directly
      const changes =
        state.mode === "guided"
          ? action.payload.filter((c) => c.type !== "remove")
          : action.payload;
      const newEdges = applyEdgeChanges(changes, state.edges);
      const hasDirtyChange = changes.some((c) => c.type === "remove");
      return {
        ...state,
        edges: newEdges,
        isDirty: state.isDirty || hasDirtyChange,
      };
    }

    default:
      return state;
  }
}

// Create context
const WorkflowEditorContext = createContext<WorkflowEditorContextValue | null>(null);

/**
 * Provider component for workflow editor context
 */
export function WorkflowEditorProvider({
  children,
  workflow,
  nodeTypes,
  onWorkflowChange,
  onDirtyChange,
  mode,
  layoutOptions,
}: WorkflowEditorProps) {
  const [state, dispatch] = useReducer(
    reducer,
    { workflow, nodeTypes, mode, layoutOptions },
    ({ workflow, nodeTypes, mode, layoutOptions }) =>
      createInitialState(workflow, nodeTypes, mode, layoutOptions)
  );

  // Load workflow when prop changes
  useEffect(() => {
    if (workflow) {
      dispatch({ type: "LOAD_WORKFLOW", payload: workflow });
    }
  }, [workflow]);

  // Follow mode prop changes (consumers may also switch via setMode)
  useEffect(() => {
    if (mode) {
      dispatch({ type: "SET_MODE", payload: mode });
    }
  }, [mode]);

  // Notify parent of dirty state changes
  useEffect(() => {
    onDirtyChange?.(state.isDirty);
  }, [state.isDirty, onDirtyChange]);

  // Notify parent of workflow changes
  useEffect(() => {
    if (state.isDirty && onWorkflowChange) {
      const currentWorkflow = getWorkflowImpl();
      onWorkflowChange(currentWorkflow);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.nodes, state.edges, state.options, state.name]);

  // Helper to get current workflow
  const getWorkflowImpl = useCallback((): Workflow => {
    return {
      id: state.workflow?.id ?? "",
      name: state.name,
      flow: {
        nodes: state.nodes,
        edges: state.edges,
      },
      options: state.options,
    };
  }, [state.workflow?.id, state.name, state.nodes, state.edges, state.options]);

  // Actions
  const loadWorkflow = useCallback((workflow: Workflow) => {
    dispatch({ type: "LOAD_WORKFLOW", payload: workflow });
  }, []);

  const resetWorkflow = useCallback(() => {
    dispatch({ type: "RESET_WORKFLOW" });
  }, []);

  const addNode = useCallback(
    (type: string, position: { x: number; y: number }) => {
      const nodeTypeDef = state.nodeTypes.get(type);
      if (!nodeTypeDef) {
        console.warn(`Unknown node type: ${type}`);
        return;
      }

      const newNode: Node = {
        id: generateNodeId(type),
        type,
        position,
        data: { ...nodeTypeDef.defaultData },
      };

      dispatch({ type: "ADD_NODE", payload: newNode });
    },
    [state.nodeTypes]
  );

  const updateNode = useCallback(
    (nodeId: string, data: Record<string, unknown>) => {
      dispatch({ type: "UPDATE_NODE", payload: { nodeId, data } });
    },
    []
  );

  const updateNodePosition = useCallback(
    (nodeId: string, position: { x: number; y: number }) => {
      dispatch({ type: "UPDATE_NODE_POSITION", payload: { nodeId, position } });
    },
    []
  );

  const removeNode = useCallback((nodeId: string) => {
    dispatch({ type: "REMOVE_NODE", payload: nodeId });
  }, []);

  const selectNode = useCallback((nodeId: string | null) => {
    dispatch({ type: "SELECT_NODE", payload: nodeId });
  }, []);

  const addEdge = useCallback(
    (connection: {
      source: string;
      target: string;
      sourceHandle?: string;
      targetHandle?: string;
    }) => {
      const newEdge: Edge = {
        id: generateEdgeId(connection.source, connection.target),
        source: connection.source,
        target: connection.target,
        sourceHandle: connection.sourceHandle,
        targetHandle: connection.targetHandle,
      };

      dispatch({ type: "ADD_EDGE", payload: newEdge });
    },
    []
  );

  const removeEdge = useCallback((edgeId: string) => {
    dispatch({ type: "REMOVE_EDGE", payload: edgeId });
  }, []);

  const setName = useCallback((name: string) => {
    dispatch({ type: "SET_NAME", payload: name });
  }, []);

  const setOptions = useCallback((options: WorkflowOptions) => {
    dispatch({ type: "SET_OPTIONS", payload: options });
  }, []);

  const registerNodeType = useCallback((definition: NodeTypeDefinition) => {
    dispatch({ type: "REGISTER_NODE_TYPE", payload: definition });
  }, []);

  const setMode = useCallback((mode: EditorMode) => {
    dispatch({ type: "SET_MODE", payload: mode });
  }, []);

  const requestInsertion = useCallback(
    (insertion: PendingInsertion | null) => {
      dispatch({ type: "SET_PENDING_INSERTION", payload: insertion });
    },
    []
  );

  const createNodeOfType = useCallback(
    (type: string): Node | null => {
      const nodeTypeDef = state.nodeTypes.get(type);
      if (!nodeTypeDef) {
        console.warn(`Unknown node type: ${type}`);
        return null;
      }
      return {
        id: generateNodeId(type),
        type,
        position: { x: 0, y: 0 },
        data: { ...nodeTypeDef.defaultData },
      };
    },
    [state.nodeTypes]
  );

  const insertNodeAfter = useCallback(
    (sourceNodeId: string, sourceHandleId: string | undefined, type: string) => {
      const node = createNodeOfType(type);
      if (!node) return;
      dispatch({
        type: "INSERT_NODE_AFTER",
        payload: { node, sourceNodeId, sourceHandleId },
      });
    },
    [createNodeOfType]
  );

  const insertNodeOnEdge = useCallback(
    (edgeId: string, type: string) => {
      const node = createNodeOfType(type);
      if (!node) return;
      // The new node's first output inherits the downstream connection
      const nodeSourceHandleId = getSourceHandles(state.nodeTypes.get(type))[0]
        ?.id;
      dispatch({
        type: "INSERT_NODE_ON_EDGE",
        payload: { node, edgeId, nodeSourceHandleId },
      });
    },
    [createNodeOfType, state.nodeTypes]
  );

  const autoLayout = useCallback(() => {
    dispatch({ type: "AUTO_LAYOUT" });
  }, []);

  const getWorkflow = useCallback(() => getWorkflowImpl(), [getWorkflowImpl]);

  const markClean = useCallback(() => {
    dispatch({ type: "MARK_CLEAN" });
  }, []);

  const onNodesChange = useCallback((changes: unknown[]) => {
    dispatch({ type: "APPLY_NODE_CHANGES", payload: changes as NodeChange[] });
  }, []);

  const onEdgesChange = useCallback((changes: unknown[]) => {
    dispatch({ type: "APPLY_EDGE_CHANGES", payload: changes as EdgeChange[] });
  }, []);

  const onConnect = useCallback(
    (connection: unknown) => {
      const conn = connection as Connection;
      if (conn.source && conn.target) {
        addEdge({
          source: conn.source,
          target: conn.target,
          sourceHandle: conn.sourceHandle ?? undefined,
          targetHandle: conn.targetHandle ?? undefined,
        });
      }
    },
    [addEdge]
  );

  const value = useMemo<WorkflowEditorContextValue>(
    () => ({
      // State
      workflow: state.workflow,
      nodes: state.nodes,
      edges: state.edges,
      options: state.options,
      name: state.name,
      selectedNodeId: state.selectedNodeId,
      isDirty: state.isDirty,
      nodeTypes: state.nodeTypes,
      mode: state.mode,
      pendingInsertion: state.pendingInsertion,
      layoutOptions: state.layoutOptions,
      // Actions
      loadWorkflow,
      resetWorkflow,
      addNode,
      updateNode,
      updateNodePosition,
      removeNode,
      selectNode,
      addEdge,
      removeEdge,
      setName,
      setOptions,
      registerNodeType,
      getWorkflow,
      markClean,
      onNodesChange,
      onEdgesChange,
      onConnect,
      setMode,
      insertNodeAfter,
      insertNodeOnEdge,
      autoLayout,
      requestInsertion,
    }),
    [
      state,
      loadWorkflow,
      resetWorkflow,
      addNode,
      updateNode,
      updateNodePosition,
      removeNode,
      selectNode,
      addEdge,
      removeEdge,
      setName,
      setOptions,
      registerNodeType,
      getWorkflow,
      markClean,
      onNodesChange,
      onEdgesChange,
      onConnect,
      setMode,
      insertNodeAfter,
      insertNodeOnEdge,
      autoLayout,
      requestInsertion,
    ]
  );

  return (
    <WorkflowEditorContext.Provider value={value}>
      {children}
    </WorkflowEditorContext.Provider>
  );
}

/**
 * Hook to access the workflow editor context
 * @throws Error if used outside of WorkflowEditorProvider
 */
export function useWorkflowEditorContext(): WorkflowEditorContextValue {
  const context = useContext(WorkflowEditorContext);
  if (!context) {
    throw new Error(
      "useWorkflowEditorContext must be used within a WorkflowEditorProvider"
    );
  }
  return context;
}
