import { useState, useEffect, useCallback } from "react";
import type { Workflow } from "@omega-flow/types";
import { listWorkflows } from "../api/workflows";

interface UseWorkflowsResult {
  workflows: Workflow[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

export function useWorkflows(): UseWorkflowsResult {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchWorkflows = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await listWorkflows();
      setWorkflows(data);
    } catch (e) {
      setError(e instanceof Error ? e : new Error("Failed to fetch workflows"));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWorkflows();
  }, [fetchWorkflows]);

  return {
    workflows,
    isLoading,
    error,
    refetch: fetchWorkflows,
  };
}
