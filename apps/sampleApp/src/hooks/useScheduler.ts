import { useState, useEffect, useCallback } from "react";
import { listScheduledEvents, type ScheduledEvent } from "../api/scheduler";

export function useScheduler() {
  const [scheduledEvents, setScheduledEvents] = useState<ScheduledEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
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
    let cancelled = false;
    (async () => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await listScheduledEvents();
        if (!cancelled) setScheduledEvents(data);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err : new Error("Failed to fetch scheduled events"));
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return { scheduledEvents, isLoading, error, refetch: fetchData };
}
