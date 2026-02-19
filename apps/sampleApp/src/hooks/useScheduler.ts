import { useState, useEffect, useCallback } from "react";
import { listScheduledEvents, type ScheduledEvent } from "../api/scheduler";

export function useScheduler() {
  const [scheduledEvents, setScheduledEvents] = useState<ScheduledEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await listScheduledEvents();
      setScheduledEvents(data);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to fetch scheduled events"));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { scheduledEvents, isLoading, error, refetch };
}
