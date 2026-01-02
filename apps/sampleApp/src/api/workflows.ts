import type { Workflow } from "@omega-flow/types";
import { apiRequest } from "./client";

const DOMAIN = "default";

export async function listWorkflows(): Promise<Workflow[]> {
  return apiRequest<Workflow[]>(`/workflows/${DOMAIN}`);
}

export async function getWorkflow(id: string): Promise<Workflow> {
  return apiRequest<Workflow>(`/workflows/${DOMAIN}/${id}`);
}

export async function createWorkflow(name: string): Promise<Workflow> {
  // Create with a default Trigger node to satisfy minItems: 1 validation
  return apiRequest<Workflow>(`/workflows/${DOMAIN}`, {
    method: "POST",
    body: JSON.stringify({
      name,
      flow: {
        nodes: [
          {
            id: "trigger-1",
            type: "Trigger",
            position: { x: 250, y: 50 },
            data: { params: { event: "" } },
          },
        ],
        edges: [],
      },
      options: { frequency: { type: "one_time" } },
    }),
  });
}

export async function updateWorkflow(workflow: Workflow): Promise<Workflow> {
  return apiRequest<Workflow>(`/workflows/${DOMAIN}/${workflow.id}`, {
    method: "PUT",
    body: JSON.stringify(workflow),
  });
}

export async function deleteWorkflow(id: string): Promise<void> {
  return apiRequest<void>(`/workflows/${DOMAIN}/${id}`, {
    method: "DELETE",
  });
}
