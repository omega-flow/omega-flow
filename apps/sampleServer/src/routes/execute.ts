import { Router } from "express";
import { nanoid } from "nanoid";
import {
  WorkflowManager,
  InMemoryWorkflowScheduler,
  nodeModels,
} from "@omega-flow/engine";
import type { Event } from "@omega-flow/types";
import type { FileWorkflowStore } from "../stores/FileWorkflowStore.js";
import type { FileWorkflowMemory } from "../stores/FileWorkflowMemory.js";

interface ExecuteRequestBody {
  type: string;
  data?: {
    subjectId: string;
    [key: string]: unknown;
  };
}

export function createExecuteRoutes(
  workflowStore: FileWorkflowStore,
  workflowMemory: FileWorkflowMemory,
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
      const scheduler = new InMemoryWorkflowScheduler();
      const manager = new WorkflowManager({
        workflowStore,
        workflowMemory,
        workflowScheduler: scheduler,
        nodeModels,
        eventExtractor: (evt) => [domain, evt.data?.subjectId as string],
      });
      scheduler.setWorkflowManager(manager);

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
