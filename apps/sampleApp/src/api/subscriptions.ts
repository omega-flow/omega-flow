import { apiRequest } from "./client";

/**
 * Active cross-subject event subscription as returned by the sample server
 * (`GET /api/subscriptions`).
 */
export interface SubscriptionEntry {
  /** Opaque id (`subscriptionKey|target`) used for deletion */
  id: string;
  domain: string;
  eventType: string;
  matchValue: string;
  workflowId: string;
  subjectId: string;
  instanceId: string;
  nodeId: string;
  createdAt: number;
  ttl?: number;
  subscriptionKey: string;
  target: string;
}

export async function listSubscriptions(): Promise<SubscriptionEntry[]> {
  return apiRequest<SubscriptionEntry[]>("/subscriptions");
}

export async function deleteSubscription(
  id: string
): Promise<{ success: boolean }> {
  return apiRequest(`/subscriptions/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}
