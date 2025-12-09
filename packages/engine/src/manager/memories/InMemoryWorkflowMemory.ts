import type { Context } from "@omega-flow/types";
import type { WorkflowMemory } from "../WorkflowMemory";

/**
 * In-memory implementation of WorkflowMemory.
 *
 * Stores workflow execution contexts in memory using a nested Map structure.
 * Useful for testing, development, and single-instance deployments.
 *
 * Storage structure: domain -> workflowId -> subjectId -> instanceId -> Context
 */
export class InMemoryWorkflowMemory implements WorkflowMemory {
  /** Nested map storing contexts by domain, workflow, subject, and instance */
  private contexts: Map<string, Map<string, Map<string, Map<string, Context>>>>;

  /**
   * Creates a new InMemoryWorkflowMemory with empty storage.
   */
  constructor() {
    this.contexts = new Map();
  }

  /**
   * Retrieve all workflow contexts for a specific subject in a domain
   * @param domain - The domain identifier
   * @param workflowId - The unique identifier of the workflow
   * @param subjectId - The unique identifier of the subject
   * @returns Promise resolving to an array of contexts
   */
  async getContexts(
    domain: string,
    workflowId: string,
    subjectId: string
  ): Promise<Context[]> {
    const domainContexts = this.contexts.get(domain);
    if (!domainContexts) {
      return [];
    }

    const workflowContexts = domainContexts.get(workflowId);
    if (!workflowContexts) {
      return [];
    }

    const subjectContexts = workflowContexts.get(subjectId);
    if (!subjectContexts) {
      return [];
    }

    return Array.from(subjectContexts.values());
  }

  /**
   * Save workflow context for a specific subject in a domain
   * @param domain - The domain identifier
   * @param workflowId - The unique identifier of the workflow
   * @param subjectId - The unique identifier of the subject
   * @param context - The context to save (identified by context.instanceId)
   */
  async saveContext(
    domain: string,
    workflowId: string,
    subjectId: string,
    context: Context
  ): Promise<void> {
    let domainContexts = this.contexts.get(domain);
    if (!domainContexts) {
      domainContexts = new Map();
      this.contexts.set(domain, domainContexts);
    }

    let workflowContexts = domainContexts.get(workflowId);
    if (!workflowContexts) {
      workflowContexts = new Map();
      domainContexts.set(workflowId, workflowContexts);
    }

    let subjectContexts = workflowContexts.get(subjectId);
    if (!subjectContexts) {
      subjectContexts = new Map();
      workflowContexts.set(subjectId, subjectContexts);
    }

    subjectContexts.set(context.instanceId, context);
  }

  /**
   * Delete workflow context for a specific subject and instance in a domain
   * @param domain - The domain identifier
   * @param workflowId - The unique identifier of the workflow
   * @param subjectId - The unique identifier of the subject
   * @param instanceId - The unique identifier of the workflow instance
   */
  async deleteContext(
    domain: string,
    workflowId: string,
    subjectId: string,
    instanceId: string
  ): Promise<void> {
    const domainContexts = this.contexts.get(domain);
    if (!domainContexts) {
      return;
    }

    const workflowContexts = domainContexts.get(workflowId);
    if (!workflowContexts) {
      return;
    }

    const subjectContexts = workflowContexts.get(subjectId);
    if (!subjectContexts) {
      return;
    }

    subjectContexts.delete(instanceId);

    // Clean up empty maps
    if (subjectContexts.size === 0) {
      workflowContexts.delete(subjectId);
    }
    if (workflowContexts.size === 0) {
      domainContexts.delete(workflowId);
    }
    if (domainContexts.size === 0) {
      this.contexts.delete(domain);
    }
  }

  /**
   * Clear all contexts from memory
   */
  async clear(): Promise<void> {
    this.contexts.clear();
  }
}
