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
