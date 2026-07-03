export class WorkflowAlreadyExistsError extends Error {
  constructor(
    public readonly domain: string,
    public readonly workflowId: string
  ) {
    super(
      `Workflow already exists: domain=${domain} workflowId=${workflowId}`
    );
    this.name = "WorkflowAlreadyExistsError";
  }
}

/**
 * Thrown by `DynamoDBWorkflowMemory.saveContext` when the conditional write
 * fails because the stored context was modified concurrently (its `version`
 * no longer matches the one that was read). The caller should treat this as
 * retryable — re-read the context and reprocess the event.
 */
export class OptimisticLockError extends Error {
  constructor(
    public readonly domain: string,
    public readonly workflowId: string,
    public readonly subjectId: string,
    public readonly instanceId: string
  ) {
    super(
      `Optimistic lock failed: domain=${domain} workflowId=${workflowId} ` +
        `subjectId=${subjectId} instanceId=${instanceId}`
    );
    this.name = "OptimisticLockError";
  }
}
