import { useState, useEffect, useCallback } from "react";
import { listAllContexts, type ContextWithSubject } from "../api/contexts";

export function useContexts() {
  const [contexts, setContexts] = useState<ContextWithSubject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await listAllContexts();
      setContexts(data);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to fetch contexts"));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { contexts, isLoading, error, refetch };
}
