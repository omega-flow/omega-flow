import type { Context } from "@omega-flow/types";
import { apiRequest } from "./client";

const DOMAIN = "default";

export interface ContextWithSubject extends Context {
  subjectId: string;
}

export async function listAllContexts(): Promise<ContextWithSubject[]> {
  return apiRequest<ContextWithSubject[]>(`/contexts/${DOMAIN}`);
}

export async function deleteContext(
  subjectId: string,
  workflowId: string,
  instanceId: string
): Promise<void> {
  return apiRequest<void>(`/contexts/${DOMAIN}/${subjectId}/${workflowId}/${instanceId}`, {
    method: "DELETE",
  });
}
