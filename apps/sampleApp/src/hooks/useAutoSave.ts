import { useEffect, useRef, useCallback } from "react";
import type { Workflow } from "@omega-flow/types";
import { updateWorkflow } from "../api/workflows";

const DEBOUNCE_MS = 1000;

interface UseAutoSaveOptions {
  enabled?: boolean;
  onSaveStart?: () => void;
  onSaveSuccess?: () => void;
  onSaveError?: (error: Error) => void;
}

export function useAutoSave(
  getWorkflow: () => Workflow,
  isDirty: boolean,
  options: UseAutoSaveOptions = {}
) {
  const { enabled = true, onSaveStart, onSaveSuccess, onSaveError } = options;
  const timeoutRef = useRef<number | null>(null);
  const isSavingRef = useRef(false);

  const save = useCallback(async () => {
    if (isSavingRef.current) return;

    isSavingRef.current = true;
    onSaveStart?.();

    try {
      const workflow = getWorkflow();
      await updateWorkflow(workflow);
      onSaveSuccess?.();
    } catch (error) {
      onSaveError?.(error instanceof Error ? error : new Error("Failed to save"));
    } finally {
      isSavingRef.current = false;
    }
  }, [getWorkflow, onSaveStart, onSaveSuccess, onSaveError]);

  // Debounced auto-save when dirty
  useEffect(() => {
    if (!enabled || !isDirty) return;

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = window.setTimeout(() => {
      save();
    }, DEBOUNCE_MS);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [enabled, isDirty, save]);

  // Save on unmount if dirty
  useEffect(() => {
    return () => {
      if (isDirty && enabled) {
        save();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { save };
}
