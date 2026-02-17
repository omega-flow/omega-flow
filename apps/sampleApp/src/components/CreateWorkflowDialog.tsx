import { useState } from "react";
import { createWorkflow } from "../api/workflows";
import {
  Button,
  Dialog,
  Field,
  Input,
  Portal,
} from "@chakra-ui/react";

interface CreateWorkflowDialogProps {
  onClose: () => void;
  onCreated: (workflowId: string) => void;
}

export function CreateWorkflowDialog({
  onClose,
  onCreated,
}: CreateWorkflowDialogProps) {
  const [name, setName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!name.trim()) {
      setError("Name is required");
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      const workflow = await createWorkflow(name.trim());
      onCreated(workflow.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create workflow");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog.Root open onOpenChange={(e) => { if (!e.open) onClose(); }}>
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content maxW="400px" borderRadius="xl" p="6">
            <Dialog.Header p="0" mb="4">
              <Dialog.Title fontSize="lg" fontWeight="600">
                Create New Workflow
              </Dialog.Title>
            </Dialog.Header>

            <Dialog.Body p="0">
              <Field.Root invalid={!!error}>
                <Input
                  placeholder="Workflow name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleCreate();
                    if (e.key === "Escape") onClose();
                  }}
                />
                {error && (
                  <Field.ErrorText>{error}</Field.ErrorText>
                )}
              </Field.Root>
            </Dialog.Body>

            <Dialog.Footer p="0" mt="6">
              <Button
                variant="outline"
                onClick={onClose}
                disabled={isCreating}
              >
                Cancel
              </Button>
              <Button
                colorPalette="blue"
                onClick={handleCreate}
                disabled={isCreating || !name.trim()}
              >
                {isCreating ? "Creating..." : "Create"}
              </Button>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
}
