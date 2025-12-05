import type { Workflow } from "@omega-flow/types";

/**
 * Interface for workflow storage backend
 * Responsible for loading workflow definitions
 */
export interface WorkflowStore {
  /**
   * Retrieve a workflow definition by its ID
   * @param domain - The domain identifier
   * @param workflowId - The unique identifier of the workflow
   * @returns Promise resolving to the workflow definition, or null if not found
   */
  getWorkflow(domain: string, workflowId: string): Promise<Workflow | null>;

  /**
   * Get all workflow definitions in the store
   * @returns Promise resolving to an array of all workflows
   */
  getAllWorkflows(domain: string): Promise<Workflow[]>;
}
