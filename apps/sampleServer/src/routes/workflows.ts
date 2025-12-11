import { Router } from "express";
import _Ajv from "ajv";
import { WorkflowSchema, type Workflow } from "@omega-flow/types";
import type { FileWorkflowStore } from "../stores/FileWorkflowStore.js";

const Ajv = _Ajv.default ?? _Ajv;
const ajv = new Ajv();

// Schema for creating workflows (without id, since it's auto-generated)
const CreateWorkflowSchema = {
  type: "object",
  required: ["name", "flow", "options"],
  properties: {
    name: { type: "string" },
    flow: WorkflowSchema.properties.flow,
    options: WorkflowSchema.properties.options,
  },
};

const validateWorkflow = ajv.compile(WorkflowSchema);
const validateCreateWorkflow = ajv.compile(CreateWorkflowSchema);

export function createWorkflowRoutes(store: FileWorkflowStore): Router {
  const router = Router();

  // GET /api/workflows/:domain - List all workflows in domain
  router.get("/:domain", async (req, res) => {
    try {
      const { domain } = req.params;
      const workflows = await store.getAllWorkflows(domain);
      res.json(workflows);
    } catch (error) {
      console.error("Error listing workflows:", error);
      res.status(500).json({ error: "Failed to list workflows" });
    }
  });

  // GET /api/workflows/:domain/:id - Get workflow by ID
  router.get("/:domain/:id", async (req, res) => {
    try {
      const { domain, id } = req.params;
      const workflow = await store.getWorkflow(domain, id);

      if (!workflow) {
        res.status(404).json({ error: "Workflow not found" });
        return;
      }

      res.json(workflow);
    } catch (error) {
      console.error("Error getting workflow:", error);
      res.status(500).json({ error: "Failed to get workflow" });
    }
  });

  // POST /api/workflows/:domain - Create new workflow
  router.post("/:domain", async (req, res) => {
    try {
      const { domain } = req.params;
      const workflowData = req.body;

      if (!validateCreateWorkflow(workflowData)) {
        res.status(400).json({
          error: "Invalid workflow data",
          details: validateCreateWorkflow.errors,
        });
        return;
      }

      const workflow = await store.createWorkflow(domain, workflowData as Omit<Workflow, "id">);
      res.status(201).json(workflow);
    } catch (error) {
      console.error("Error creating workflow:", error);
      res.status(500).json({ error: "Failed to create workflow" });
    }
  });

  // PUT /api/workflows/:domain/:id - Update workflow
  router.put("/:domain/:id", async (req, res) => {
    try {
      const { domain, id } = req.params;
      const workflowData = req.body;

      // Check if workflow exists
      const existing = await store.getWorkflow(domain, id);
      if (!existing) {
        res.status(404).json({ error: "Workflow not found" });
        return;
      }

      // Ensure ID matches
      const workflow = { ...workflowData, id };

      if (!validateWorkflow(workflow)) {
        res.status(400).json({
          error: "Invalid workflow data",
          details: validateWorkflow.errors,
        });
        return;
      }

      await store.setWorkflow(domain, workflow as unknown as Workflow);
      res.json(workflow);
    } catch (error) {
      console.error("Error updating workflow:", error);
      res.status(500).json({ error: "Failed to update workflow" });
    }
  });

  // DELETE /api/workflows/:domain/:id - Delete workflow
  router.delete("/:domain/:id", async (req, res) => {
    try {
      const { domain, id } = req.params;
      const deleted = await store.deleteWorkflow(domain, id);

      if (!deleted) {
        res.status(404).json({ error: "Workflow not found" });
        return;
      }

      res.status(204).send();
    } catch (error) {
      console.error("Error deleting workflow:", error);
      res.status(500).json({ error: "Failed to delete workflow" });
    }
  });

  return router;
}
