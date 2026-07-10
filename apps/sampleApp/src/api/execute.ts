import { apiRequest } from "./client";

const DOMAIN = "default";

/**
 * One cross-subject subscription delivery scheduled by the execute endpoint.
 * The delivery travels through the workflow scheduler — fire it (or use
 * auto-fire) to resume the subscribed instance.
 */
export interface DeliveryResult {
  scheduleId: string;
  workflowId: string;
  subjectId: string;
  instanceId: string;
  nodeId: string;
  matchSubjectId: string;
}

export interface ExecuteResponse {
  success: boolean;
  event: {
    id: string;
    time: number;
    type: string;
  };
  deliveries: DeliveryResult[];
}

export async function executeEvent(
  type: string,
  subjectId: string,
  data?: Record<string, unknown>
): Promise<ExecuteResponse> {
  // `type` (the action) and `subjectId` are envelope fields — they belong on
  // the event itself, not inside `data`. `data` carries only the business
  // payload, so routing never has to be derived from it.
  return apiRequest<ExecuteResponse>(`/execute/${DOMAIN}`, {
    method: "POST",
    body: JSON.stringify({
      type,
      subjectId,
      data: data ?? {},
    }),
  });
}
