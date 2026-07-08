import { apiRequest } from "./client";

const DOMAIN = "default";

/** One cross-subject subscription delivery reported by the execute endpoint. */
export interface DeliveryResult {
  workflowId: string;
  subjectId: string;
  instanceId: string;
  nodeId: string;
  matchSubjectId: string;
  /** True when the target instance was actually resumed, false when dropped */
  resumed: boolean;
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
  return apiRequest<ExecuteResponse>(`/execute/${DOMAIN}`, {
    method: "POST",
    body: JSON.stringify({
      type,
      data: {
        subjectId,
        ...data,
      },
    }),
  });
}
