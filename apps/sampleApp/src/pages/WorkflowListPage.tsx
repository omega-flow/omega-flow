import { useState } from "react";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import { useWorkflows } from "../hooks/useWorkflows";
import { deleteWorkflow } from "../api/workflows";
import { CreateWorkflowDialog } from "../components/CreateWorkflowDialog";
import {
  Box,
  Button,
  Container,
  Flex,
  Heading,
  Link,
  Stack,
  Text,
} from "@chakra-ui/react";

export function WorkflowListPage() {
  const { workflows, isLoading, error, refetch } = useWorkflows();
  const navigate = useNavigate();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!confirm("Are you sure you want to delete this workflow?")) return;

    try {
      await deleteWorkflow(id);
      refetch();
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "Failed to delete");
    }
  };

  const handleCreated = (workflowId: string) => {
    setShowCreateDialog(false);
    navigate(`/workflows/${workflowId}`);
  };

  if (isLoading) {
    return (
      <Container maxW="6xl" p="6">
        <Text textAlign="center" py="12" color="gray.500">
          Loading workflows...
        </Text>
      </Container>
    );
  }

  return (
    <Container maxW="7xl" p="6">
      <Flex justify="space-between" align="center" mb="6">
        <Heading size="xl">Workflows</Heading>
        <Button colorPalette="blue" onClick={() => setShowCreateDialog(true)}>
          Create Workflow
        </Button>
      </Flex>

      {error && (
        <Box bg="red.50" color="red.600" p="4" borderRadius="lg" mb="4">
          Error: {error.message}
        </Box>
      )}
      {deleteError && (
        <Box bg="red.50" color="red.600" p="4" borderRadius="lg" mb="4">
          {deleteError}
        </Box>
      )}

      {workflows.length === 0 ? (
        <Text textAlign="center" py="12" color="gray.500" fontSize="md">
          No workflows yet. Create your first workflow to get started.
        </Text>
      ) : (
        <Stack gap="3">
          {workflows.map((workflow) => (
            <Flex
              key={workflow.id}
              bg="white"
              border="1px solid"
              borderColor="gray.200"
              borderRadius="lg"
              px="5"
              py="4"
              align="center"
              justify="space-between"
            >
              <Link asChild flex="1" _hover={{ textDecoration: "none" }}>
                <RouterLink to={`/workflows/${workflow.id}`}>
                  <Text fontWeight="500" color="gray.900">
                    {workflow.name || "Untitled"}
                  </Text>
                  <Text fontSize="xs" color="gray.400" fontFamily="mono" mt="1">
                    {workflow.id}
                  </Text>
                </RouterLink>
              </Link>
              <Button
                size="xs"
                variant="subtle"
                colorPalette="red"
                onClick={(e) => handleDelete(workflow.id, e)}
              >
                Delete
              </Button>
            </Flex>
          ))}
        </Stack>
      )}

      {showCreateDialog && (
        <CreateWorkflowDialog
          onClose={() => setShowCreateDialog(false)}
          onCreated={handleCreated}
        />
      )}
    </Container>
  );
}
