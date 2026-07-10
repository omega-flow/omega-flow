import { useState, useEffect, useCallback } from "react";
import { listSubscriptions, type SubscriptionEntry } from "../api/subscriptions";

export function useSubscriptions() {
  const [subscriptions, setSubscriptions] = useState<SubscriptionEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await listSubscriptions();
      setSubscriptions(data);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to fetch subscriptions"));
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
        const data = await listSubscriptions();
        if (!cancelled) setSubscriptions(data);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err : new Error("Failed to fetch subscriptions"));
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return { subscriptions, isLoading, error, refetch: fetchData };
}
