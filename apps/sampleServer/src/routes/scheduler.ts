import { Router } from "express";
import { WorkflowManager } from "@omega-flow/engine";
import type { Event } from "@omega-flow/types";
import type { SampleWorkflowStore, SampleWorkflowMemory, SampleWorkflowScheduler, SampleSubscriptionStore } from "../stores/types.js";
import { nodeModels } from "../nodes/index.js";

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

      const entry = (await workflowScheduler.remove(scheduleId)) as { event: Event } | null;
      if (!entry) {
        res.status(404).json({ error: "Scheduled event not found" });
        return;
      }

      // Every scheduled event carries envelope routing: timeout copies inherit
      // the source event's domain/subjectId, and subscription delivery copies
      // carry explicit routing too. So the engine routes them directly — no
      // eventExtractor fallback is needed.
      const manager = new WorkflowManager({
        workflowStore,
        workflowMemory,
        workflowScheduler,
        subscriptionStore,
        nodeModels,
      });
      workflowScheduler.setWorkflowManager?.(manager);

      // processEvent handles everything: a fired delivery copy resumes its
      // target instance (result.delivered); an ordinary fired event (e.g. a
      // timeout) runs normal routing and may schedule further deliveries.
      const result = await manager.processEvent(entry.event);

      res.json({
        success: true,
        event: {
          id: entry.event.id,
          time: entry.event.time,
          type: entry.event.type,
        },
        delivered: result.delivered,
        deliveries: result.deliveries,
      });
    } catch (error) {
      console.error("Error firing scheduled event:", error);
      res.status(500).json({
        error: "Failed to fire scheduled event",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  // DELETE /api/scheduler/:scheduleId - Delete a scheduled event without firing it
  router.delete("/:scheduleId", async (req, res) => {
    try {
      if (!workflowScheduler.remove) {
        res.status(501).json({ error: "Deleting scheduled events is not supported with the current scheduler backend" });
        return;
      }
      const { scheduleId } = req.params;

      const removed = await workflowScheduler.remove(scheduleId);
      if (!removed) {
        res.status(404).json({ error: "Scheduled event not found" });
        return;
      }

      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting scheduled event:", error);
      res.status(500).json({
        error: "Failed to delete scheduled event",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  return router;
}
