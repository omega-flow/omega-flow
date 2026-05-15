import { Router } from "express";
import { WorkflowManager } from "@omega-flow/engine";
import type { FileWorkflowStore } from "../stores/FileWorkflowStore.js";
import type { FileWorkflowMemory } from "../stores/FileWorkflowMemory.js";
import type { FileWorkflowScheduler } from "../stores/FileWorkflowScheduler.js";
import { nodeModels } from "../nodes/index.js";

export function createSchedulerRoutes(
  workflowStore: FileWorkflowStore,
  workflowMemory: FileWorkflowMemory,
  workflowScheduler: FileWorkflowScheduler,
): Router {
  const router = Router();

  // GET /api/scheduler - List all scheduled events
  router.get("/", async (_req, res) => {
    try {
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
      const { scheduleId } = req.params;

      const entry = await workflowScheduler.remove(scheduleId);
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
        nodeModels,
        eventExtractor: (evt) => [domain, evt.data?.subjectId as string],
      });
      workflowScheduler.setWorkflowManager(manager);

      await manager.processEvent(entry.event);

      res.json({
        success: true,
        event: {
          id: entry.event.id,
          time: entry.event.time,
          type: entry.event.type,
        },
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
