import { useCallback, useState } from "react";
import { useParams, Link as RouterLink } from "react-router-dom";
import { ReactFlow, Background, Controls, Panel } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
// Import Omega Flow editor styles for theming support
import "@omega-flow/editor/styles.css";
// Uncomment to enable dark theme (also requires data-omega-flow-theme="dark" on a wrapper)
// import "@omega-flow/editor/themes/dark.css";
import {
  WorkflowEditor,
  NodesPanel,
  OptionsPanel,
  DetailPanel,
  ControlPanel,
  useNodes,
  useEdges,
  useNodeRegistry,
  useDragAndDrop,
  useWorkflowEditor,
} from "@omega-flow/editor";
import { nodeTypes } from "../nodes";
import { useWorkflow } from "../hooks/useWorkflow";
import { useAutoSave } from "../hooks/useAutoSave";
import { updateWorkflow } from "../api/workflows";
import { Box, Flex, HStack, Link, Text } from "@chakra-ui/react";

function EditorCanvas() {
  const { nodes, onNodesChange } = useNodes();
  const { edges, onEdgesChange, onConnect } = useEdges();
  const { reactFlowNodeTypes } = useNodeRegistry();
  const { onDragOver, onDrop } = useDragAndDrop();
  const { getWorkflow, isDirty, markClean } = useWorkflowEditor();
  const [saveStatus, setSaveStatus] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");

  // Auto-save hook
  useAutoSave(getWorkflow, isDirty, {
    onSaveStart: () => setSaveStatus("saving"),
    onSaveSuccess: () => {
      setSaveStatus("saved");
      markClean();
      setTimeout(() => setSaveStatus("idle"), 2000);
    },
    onSaveError: () => setSaveStatus("error"),
  });

  // Manual save handler
  const handleSave = useCallback(async () => {
    setSaveStatus("saving");
    try {
      await updateWorkflow(getWorkflow());
      markClean();
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 2000);
    } catch {
      setSaveStatus("error");
    }
  }, [getWorkflow, markClean]);

  return (
    <>
      <HStack
        bg="white"
        borderBottom="1px solid"
        borderColor="gray.200"
        px="4"
        py="2"
        gap="4"
      >
        <Link asChild color="gray.500" fontSize="sm" display="flex" alignItems="center" gap="1" _hover={{ textDecoration: "none" }}>
          <RouterLink to="/">&larr; Back to Workflows</RouterLink>
        </Link>
        <Text ml="auto" fontSize="xs" color="gray.500">
          {saveStatus === "saving" && "Saving..."}
          {saveStatus === "saved" && "Saved"}
          {saveStatus === "error" && "Error saving"}
          {saveStatus === "idle" && isDirty && "Unsaved changes"}
        </Text>
      </HStack>

      <Box flex="1" position="relative">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onDragOver={onDragOver}
          onDrop={onDrop}
          nodeTypes={reactFlowNodeTypes}
          fitView
          fitViewOptions={{ padding: 0.2 }}
        >
          <Background />
          <Controls />

          <Panel position="top-left">
            <NodesPanel />
          </Panel>

          <Panel position="top-right">
            <ControlPanel onSave={handleSave} />
          </Panel>

          <Panel position="bottom-left">
            <OptionsPanel />
          </Panel>

          <Panel position="bottom-right">
            <DetailPanel />
          </Panel>
        </ReactFlow>
      </Box>
    </>
  );
}

export function WorkflowEditorPage() {
  const { workflowId } = useParams<{ workflowId: string }>();
  const { workflow, isLoading, error } = useWorkflow(workflowId!);

  if (isLoading) {
    return (
      <Flex direction="column" h="calc(100vh - 52px)">
        <Flex align="center" justify="center" h="100%" color="gray.500">
          Loading workflow...
        </Flex>
      </Flex>
    );
  }

  if (error) {
    return (
      <Flex direction="column" h="calc(100vh - 52px)">
        <Flex align="center" justify="center" h="100%" direction="column" gap="4" color="red.600">
          <Text>Error: {error.message}</Text>
          <Link asChild color="blue.500">
            <RouterLink to="/">Back to Workflows</RouterLink>
          </Link>
        </Flex>
      </Flex>
    );
  }

  if (!workflow) {
    return (
      <Flex direction="column" h="calc(100vh - 52px)">
        <Flex align="center" justify="center" h="100%" direction="column" gap="4" color="red.600">
          <Text>Workflow not found</Text>
          <Link asChild color="blue.500">
            <RouterLink to="/">Back to Workflows</RouterLink>
          </Link>
        </Flex>
      </Flex>
    );
  }

  return (
    <Flex direction="column" h="calc(100vh - 52px)">
      <WorkflowEditor workflow={workflow} nodeTypes={nodeTypes}>
        <EditorCanvas />
      </WorkflowEditor>
    </Flex>
  );
}
