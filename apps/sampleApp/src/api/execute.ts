import { apiRequest } from "./client";

const DOMAIN = "default";

interface ExecuteResponse {
  success: boolean;
  event: {
    id: string;
    time: number;
    type: string;
  };
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
