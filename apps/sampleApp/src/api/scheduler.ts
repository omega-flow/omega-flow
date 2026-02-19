import { apiRequest } from "./client";
import type { Event } from "@omega-flow/types";

export interface ScheduledEvent {
  scheduleId: string;
  event: Event;
  fireAt: number;
  scheduledAt: number;
}

export async function listScheduledEvents(): Promise<ScheduledEvent[]> {
  return apiRequest<ScheduledEvent[]>("/scheduler");
}

export async function fireScheduledEvent(
  scheduleId: string
): Promise<{ success: boolean; event: { id: string; time: number; type: string } }> {
  return apiRequest(`/scheduler/${scheduleId}/fire`, {
    method: "POST",
  });
}
