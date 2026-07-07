import { Router } from "express";
import { WorkflowManager } from "@omega-flow/engine";
import type { SampleWorkflowStore, SampleWorkflowMemory, SampleWorkflowScheduler, SampleSubscriptionStore } from "../stores/types.js";
import { nodeModels } from "../nodes/index.js";
import { deliverToSubscribers } from "../subscriptionDelivery.js";

export function createSchedulerRoutes(
  workflowStore: SampleWorkflowStore,
  workflowMemory: SampleWorkflowMemory,
  workflowScheduler: SampleWorkflowScheduler,
  subscriptionStore: SampleSubscriptionStore,
): Router {
  const router = Router();

  // GET /api/scheduler - List all scheduled events
  router.get("/", async (_req, res) => {
    try {
      if (!workflowScheduler.getAll) {
        res.status(501).json({ error: "Listing scheduled events is not supported with the current scheduler backend" });
        return;
      }
      const events = await workflowScheduler.getAll();
      res.json(events);
    } catch (error) {
      console.error("Error fetching scheduled events:", error);
      res.status(500).json({
        error: "Failed to fetch scheduled events",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  // POST /api/scheduler/:scheduleId/fire - Fire a scheduled event
  router.post("/:scheduleId/fire", async (req, res) => {
    try {
      if (!workflowScheduler.remove) {
        res.status(501).json({ error: "Firing scheduled events is not supported with the current scheduler backend" });
        return;
      }
      const { scheduleId } = req.params;

      const entry = await workflowScheduler.remove(scheduleId) as { event: { id: string; time: number; type: string; data?: unknown } } | null;
      if (!entry) {
        res.status(404).json({ error: "Scheduled event not found" });
        return;
      }

      // Determine domain from event data
      const domain = "default";

      const manager = new WorkflowManager({
        workflowStore,
        workflowMemory,
        workflowScheduler,
        subscriptionStore,
        nodeModels,
        eventExtractor: (evt) => [domain, evt.data?.subjectId as string],
      });
      workflowScheduler.setWorkflowManager?.(manager);

      await manager.processEvent(entry.event);

      const deliveries = await deliverToSubscribers(manager, domain, entry.event);

      res.json({
        success: true,
        event: {
          id: entry.event.id,
          time: entry.event.time,
          type: entry.event.type,
        },
        deliveries,
      });
    } catch (error) {
      console.error("Error firing scheduled event:", error);
      res.status(500).json({
        error: "Failed to fire scheduled event",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  return router;
}
