import type { Context } from "@omega-flow/types";

/**
 * Interface for workflow context storage backend
 * Responsible for persisting and retrieving workflow execution state for each subject
 */
export interface WorkflowMemory {
  /**
   * Retrieve all workflow contexts for a specific subject in a domain
   * Supports multiple concurrent instances of the same workflow for a subject
   * @param domain - The domain identifier (tenant, organization, etc.)
   * @param workflowId - The unique identifier of the workflow
   * @param subjectId - The unique identifier of the subject (user, order, device, etc.)
   * @returns Promise resolving to an array of contexts (empty if none found)
   */
  getContexts(
    domain: string,
    workflowId: string,
    subjectId: string,
  ): Promise<Context[]>;

  /**
   * Save workflow context for a specific subject in a domain
   * @param domain - The domain identifier (tenant, organization, etc.)
   * @param workflowId - The unique identifier of the workflow
   * @param subjectId - The unique identifier of the subject
   * @param context - The context to save (identified by context.instanceId)
   */
  saveContext(
    domain: string,
    workflowId: string,
    subjectId: string,
    context: Context,
  ): Promise<void>;

  /**
   * Delete workflow context for a specific subject and instance in a domain
   * @param domain - The domain identifier (tenant, organization, etc.)
   * @param workflowId - The unique identifier of the workflow
   * @param subjectId - The unique identifier of the subject
   * @param instanceId - The unique identifier of the workflow instance
   */
  deleteContext(
    domain: string,
    workflowId: string,
    subjectId: string,
    instanceId: string,
  ): Promise<void>;
}
