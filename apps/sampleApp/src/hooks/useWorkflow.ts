import { useState, useEffect, useCallback } from "react";
import type { Workflow } from "@omega-flow/types";
import { getWorkflow } from "../api/workflows";

interface UseWorkflowResult {
  workflow: Workflow | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

export function useWorkflow(id: string): UseWorkflowResult {
  const [workflow, setWorkflow] = useState<Workflow | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchWorkflow = useCallback(async () => {
    if (!id) return;

    setIsLoading(true);
    setError(null);
    try {
      const data = await getWorkflow(id);
      setWorkflow(data);
    } catch (e) {
      setError(e instanceof Error ? e : new Error("Failed to fetch workflow"));
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await getWorkflow(id);
        if (!cancelled) setWorkflow(data);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e : new Error("Failed to fetch workflow"));
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [id]);

  return {
    workflow,
    isLoading,
    error,
    refetch: fetchWorkflow,
  };
}
