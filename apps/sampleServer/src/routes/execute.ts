import { Router } from "express";
import { nanoid } from "nanoid";
import { WorkflowManager } from "@omega-flow/engine";
import type { Event } from "@omega-flow/types";
import type {
  SampleWorkflowStore,
  SampleWorkflowMemory,
  SampleWorkflowScheduler,
  SampleSubscriptionStore,
} from "../stores/types.js";
import { nodeModels } from "../nodes/index.js";

interface ExecuteRequestBody {
  type: string;
  subjectId: string;
  data?: Record<string, unknown>;
}

export function createExecuteRoutes(
  workflowStore: SampleWorkflowStore,
  workflowMemory: SampleWorkflowMemory,
  workflowScheduler: SampleWorkflowScheduler,
  subscriptionStore: SampleSubscriptionStore,
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

      if (!body.subjectId) {
        res.status(400).json({ error: "subjectId is required" });
        return;
      }

      // Create the event with auto-generated id and time. `type` (the action),
      // `domain`, and `subjectId` are envelope fields; `data` carries only the
      // business payload. Because routing lives on the envelope, the engine
      // never derives it from the payload — no eventExtractor is configured.
      const event: Event = {
        id: nanoid(),
        time: Date.now(),
        type: body.type,
        domain,
        subjectId: body.subjectId,
        data: body.data ?? {},
      };

      // Create WorkflowManager
      const manager = new WorkflowManager({
        workflowStore,
        workflowMemory,
        workflowScheduler,
        subscriptionStore,
        nodeModels,
      });
      workflowScheduler.setWorkflowManager?.(manager);

      // Process the event. Cross-subject subscription matches are scheduled
      // as delivery events through the workflowScheduler (delay 0) — fire
      // them from the Debugger (or auto-fire) to resume the subscribers,
      // the same topology a production queue relay runs.
      const result = await manager.processEvent(event);

      res.json({
        success: true,
        event: {
          id: event.id,
          time: event.time,
          type: event.type,
        },
        deliveries: result.deliveries,
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
