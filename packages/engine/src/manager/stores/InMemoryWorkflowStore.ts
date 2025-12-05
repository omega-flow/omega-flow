import type { Workflow } from "@omega-flow/types";
import type { WorkflowStore } from "../WorkflowStore";

/**
 * In-memory implementation of WorkflowStore
 * Stores workflow definitions in memory using a nested Map structure
 * Key format: domain -> workflowId -> Workflow
 */
export class InMemoryWorkflowStore implements WorkflowStore {
  private workflows: Map<string, Map<string, Workflow>>;

  constructor(workflows: Array<{ domain: string; workflow: Workflow }> = []) {
    this.workflows = new Map();
    for (const { domain, workflow } of workflows) {
      let domainWorkflows = this.workflows.get(domain);
      if (!domainWorkflows) {
        domainWorkflows = new Map();
        this.workflows.set(domain, domainWorkflows);
      }
      domainWorkflows.set(workflow.id, workflow);
    }
  }

  /**
   * Retrieve a workflow definition by its ID
   * @param domain - The domain identifier
   * @param workflowId - The unique identifier of the workflow
   * @returns Promise resolving to the workflow definition, or null if not found
   */
  async getWorkflow(domain: string, workflowId: string): Promise<Workflow | null> {
    const domainWorkflows = this.workflows.get(domain);
    return domainWorkflows?.get(workflowId) ?? null;
  }

  /**
   * Add or update a workflow definition in the store
   * @param domain - The domain identifier
   * @param workflow - The workflow definition to add or update
   */
  async setWorkflow(domain: string, workflow: Workflow): Promise<void> {
    let domainWorkflows = this.workflows.get(domain);
    if (!domainWorkflows) {
      domainWorkflows = new Map();
      this.workflows.set(domain, domainWorkflows);
    }
    domainWorkflows.set(workflow.id, workflow);
  }

  /**
   * Remove a workflow definition from the store
   * @param domain - The domain identifier
   * @param workflowId - The unique identifier of the workflow to remove
   */
  async deleteWorkflow(domain: string, workflowId: string): Promise<void> {
    const domainWorkflows = this.workflows.get(domain);
    if (domainWorkflows) {
      domainWorkflows.delete(workflowId);
      if (domainWorkflows.size === 0) {
        this.workflows.delete(domain);
      }
    }
  }

  /**
   * Get all workflow definitions in the store for a specific domain
   * @param domain - The domain identifier
   * @returns Promise resolving to an array of all workflows in the domain
   */
  async getAllWorkflows(domain: string): Promise<Workflow[]> {
    const domainWorkflows = this.workflows.get(domain);
    if (!domainWorkflows) {
      return [];
    }
    return Array.from(domainWorkflows.values());
  }
}
