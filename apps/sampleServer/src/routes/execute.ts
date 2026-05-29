import { Router } from "express";
import { nanoid } from "nanoid";
import { WorkflowManager } from "@omega-flow/engine";
import type { Event } from "@omega-flow/types";
import type { SampleWorkflowStore, SampleWorkflowMemory, SampleWorkflowScheduler } from "../stores/types.js";
import { nodeModels } from "../nodes/index.js";

interface ExecuteRequestBody {
  type: string;
  data?: {
    subjectId: string;
    [key: string]: unknown;
  };
}

export function createExecuteRoutes(
  workflowStore: SampleWorkflowStore,
  workflowMemory: SampleWorkflowMemory,
  workflowScheduler: SampleWorkflowScheduler,
): Router {
  const router = Router();

  // POST /api/execute/:domain - Execute an event
  router.post("/:domain", async (req, res) => {
    try {
      const { domain } = req.params;
      const body = req.body as ExecuteRequestBody;

      if (!body.type) {
        res.status(400).json({ error: "Event type is required" });
        return;
      }

      if (!body.data?.subjectId) {
        res.status(400).json({ error: "data.subjectId is required" });
        return;
      }

      // Create the event with auto-generated id and time
      const event: Event = {
        id: nanoid(),
        time: Date.now(),
        type: body.type,
        data: body.data,
      };

      // Create WorkflowManager
      const manager = new WorkflowManager({
        workflowStore,
        workflowMemory,
        workflowScheduler,
        nodeModels,
        eventExtractor: (evt) => [domain, evt.data?.subjectId as string],
      });
      workflowScheduler.setWorkflowManager?.(manager);

      // Process the event
      await manager.processEvent(event);

      res.json({
        success: true,
        event: {
          id: event.id,
          time: event.time,
          type: event.type,
        },
      });
    } catch (error) {
      console.error("Error executing event:", error);
      res.status(500).json({
        error: "Failed to execute event",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  return router;
}
