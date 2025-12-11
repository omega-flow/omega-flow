import { Router } from "express";
import _Ajv from "ajv";
import { ContextSchema, type Context } from "@omega-flow/types";
import type { FileWorkflowMemory } from "../stores/FileWorkflowMemory.js";

const Ajv = _Ajv.default ?? _Ajv;
const ajv = new Ajv();
const validateContext = ajv.compile(ContextSchema);

export function createContextRoutes(memory: FileWorkflowMemory): Router {
  const router = Router();

  // GET /api/contexts/:domain/:subjectId - List all contexts for a subject in domain
  router.get("/:domain/:subjectId", async (req, res) => {
    try {
      const { domain, subjectId } = req.params;
      const contexts = await memory.getAllContextsForSubject(domain, subjectId);
      res.json(contexts);
    } catch (error) {
      console.error("Error listing contexts:", error);
      res.status(500).json({ error: "Failed to list contexts" });
    }
  });

  // GET /api/contexts/:domain/:subjectId/:workflowId - Get all contexts for subject+workflow
  router.get("/:domain/:subjectId/:workflowId", async (req, res) => {
    try {
      const { domain, subjectId, workflowId } = req.params;
      const contexts = await memory.getContexts(domain, workflowId, subjectId);
      res.json(contexts);
    } catch (error) {
      console.error("Error listing contexts:", error);
      res.status(500).json({ error: "Failed to list contexts" });
    }
  });

  // GET /api/contexts/:domain/:subjectId/:workflowId/:instanceId - Get specific context
  router.get("/:domain/:subjectId/:workflowId/:instanceId", async (req, res) => {
    try {
      const { domain, subjectId, workflowId, instanceId } = req.params;
      const context = await memory.getContext(domain, workflowId, subjectId, instanceId);

      if (!context) {
        res.status(404).json({ error: "Context not found" });
        return;
      }

      res.json(context);
    } catch (error) {
      console.error("Error getting context:", error);
      res.status(500).json({ error: "Failed to get context" });
    }
  });

  // POST /api/contexts/:domain/:subjectId/:workflowId - Create/update context
  router.post("/:domain/:subjectId/:workflowId", async (req, res) => {
    try {
      const { domain, subjectId, workflowId } = req.params;
      const context = req.body;

      if (!validateContext(context)) {
        res.status(400).json({
          error: "Invalid context data",
          details: validateContext.errors,
        });
        return;
      }

      // Ensure workflowId in context matches URL
      if (context.workflowId !== workflowId) {
        res.status(400).json({
          error: "Workflow ID in context does not match URL",
        });
        return;
      }

      await memory.saveContext(domain, workflowId, subjectId, context as unknown as Context);
      res.status(201).json(context);
    } catch (error) {
      console.error("Error saving context:", error);
      res.status(500).json({ error: "Failed to save context" });
    }
  });

  // DELETE /api/contexts/:domain/:subjectId/:workflowId/:instanceId - Delete context
  router.delete("/:domain/:subjectId/:workflowId/:instanceId", async (req, res) => {
    try {
      const { domain, subjectId, workflowId, instanceId } = req.params;
      await memory.deleteContext(domain, workflowId, subjectId, instanceId);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting context:", error);
      res.status(500).json({ error: "Failed to delete context" });
    }
  });

  return router;
}
