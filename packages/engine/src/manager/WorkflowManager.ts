import { type Event, type Workflow, type Context, WorkflowStatus } from "@omega-flow/types";
import type { WorkflowStore } from "./WorkflowStore";
import type { WorkflowMemory } from "./WorkflowMemory";
import type { WorkflowScheduler } from "./WorkflowScheduler";
import WorkflowModel from "../engine/WorkflowModel";
import type NodeModel from "../engine/NodeModel";

/**
 * Configuration options for WorkflowManager.
 */
export interface WorkflowManagerConfig {
  /** Storage backend for workflow definitions */
  workflowStore: WorkflowStore;
  /** Storage backend for workflow execution contexts */
  workflowMemory: WorkflowMemory;
  /** Scheduler for time-based workflow events */
  workflowScheduler: WorkflowScheduler;
  /** Map of node type names to their NodeModel classes */
  nodeModels: Record<string, typeof NodeModel>;
  /**
   * Function to extract domain and subject ID from an event.
   * The domain allows multi-tenant workflow isolation.
   * The subject ID identifies which entity (user, order, etc.) the workflow is for.
   * @param event - The incoming event
   * @returns Tuple of [domain, subjectId]
   */
  eventExtractor: (event: Event) => [string, string];
}

/**
 * Orchestrates multiple workflows across multiple subjects and domains.
 *
 * WorkflowManager is the top-level coordinator that:
 * - Routes incoming events to the appropriate workflow instances
 * - Manages workflow lifecycle (start, resume, complete)
 * - Handles state persistence via WorkflowMemory
 * - Enforces workflow frequency rules (one_time, every_rematch)
 *
 * Each combination of (domain, workflowId, subjectId) can have multiple
 * workflow instances depending on the frequency configuration.
 *
 * @example
 * ```typescript
 * const manager = new WorkflowManager({
 *   workflowStore: new InMemoryWorkflowStore([...]),
 *   workflowMemory: new InMemoryWorkflowMemory(),
 *   workflowScheduler: new InMemoryWorkflowScheduler(),
 *   nodeModels: { Trigger: TriggerModel, Action: ActionModel, Exit: ExitModel },
 *   eventExtractor: (event) => [event.data.domain, event.data.userId],
 * });
 *
 * await manager.processEvent({ type: 'user_signup', time: Date.now(), data: {...} });
 * ```
 */
export class WorkflowManager {
  /** Storage backend for workflow definitions */
  private workflowStore: WorkflowStore;
  /** Storage backend for workflow execution contexts */
  private workflowMemory: WorkflowMemory;
  /** Scheduler for time-based workflow events */
  private workflowScheduler: WorkflowScheduler;
  /** Map of node type names to their NodeModel classes */
  private nodeModels: Record<string, typeof NodeModel>;
  /** Function to extract domain and subject ID from events */
  private eventExtractor: (event: Event) => [string, string];

  /**
   * Creates a new WorkflowManager instance.
   * @param config - Configuration options including storage backends and node models
   */
  constructor(config: WorkflowManagerConfig) {
    this.workflowStore = config.workflowStore;
    this.workflowMemory = config.workflowMemory;
    this.workflowScheduler = config.workflowScheduler;
    this.nodeModels = config.nodeModels;
    this.eventExtractor = config.eventExtractor;
  }

  /**
   * Process an event by routing it to appropriate workflow instances
   * @param event - The event to process
   */
  async processEvent(event: Event): Promise<void> {
    // Extract domain and subject ID from the event
    const [domain, subjectId] = this.eventExtractor(event);

    // Get all workflow definitions for this domain
    const workflows = await this.workflowStore.getAllWorkflows(domain);

    // Process each workflow that should handle this event
    for (const workflowDef of workflows) {
      try {
        await this.processWorkflowForEvent(
          workflowDef,
          event,
          domain,
          subjectId
        );
      } catch (error) {
        console.error(
          `Error processing workflow ${workflowDef.id} for domain ${domain}, subject ${subjectId}:`,
          error
        );
        // Continue processing other workflows even if one fails
      }
    }
  }

  /**
   * Process a specific workflow definition for an event
   * @param workflowDef - The workflow definition
   * @param event - The event to process
   * @param domain - The domain identifier
   * @param subjectId - The subject ID extracted from the event
   */
  private async processWorkflowForEvent(
    workflowDef: Workflow,
    event: Event,
    domain: string,
    subjectId: string
  ): Promise<void> {
    // Load all existing contexts for this workflow and subject
    const contexts = await this.workflowMemory.getContexts(
      domain,
      workflowDef.id,
      subjectId
    );

    // Separate active and completed instances
    const activeContexts = contexts.filter((ctx) => !ctx.isCompleted);
    const completedContexts = contexts.filter((ctx) => ctx.isCompleted);

    // Process all active instances with this event
    for (const context of activeContexts) {
      await this.resumeWorkflowInstance(
        workflowDef,
        context,
        event,
        domain,
        subjectId
      );
    }

    // Check if we should start a new instance based on frequency
    const canStartNew = this.canStartNewInstance(
      workflowDef,
      activeContexts,
      completedContexts
    );

    if (canStartNew) {
      await this.tryStartNewWorkflowInstance(
        workflowDef,
        event,
        domain,
        subjectId
      );
    }
  }

  /**
   * Check if a new workflow instance can be started based on frequency option
   * @param workflowDef - The workflow definition
   * @param activeContexts - Currently active workflow instances
   * @param completedContexts - Completed workflow instances
   * @returns true if a new instance can be started
   */
  private canStartNewInstance(
    workflowDef: Workflow,
    activeContexts: Context[],
    completedContexts: Context[]
  ): boolean {
    const frequency = workflowDef.options.frequency;

    if (!frequency) {
      // No frequency specified - default to one_time behavior
      return activeContexts.length === 0 && completedContexts.length === 0;
    }

    if (frequency.type === "one_time") {
      // Can only start if no instances exist at all
      return activeContexts.length === 0 && completedContexts.length === 0;
    }

    if (frequency.type === "every_rematch") {
      // Can't start if there's already an active instance
      if (activeContexts.length > 0) {
        return false;
      }

      // Check interval since last completed instance
      if (frequency.interval && completedContexts.length > 0) {
        const mostRecentCompleted = completedContexts.reduce((latest, ctx) =>
          ctx.startedAt > latest.startedAt ? ctx : latest
        );

        const intervalMs = frequency.interval * 1000;
        const timeSinceLastStart = Date.now() - mostRecentCompleted.startedAt;

        return timeSinceLastStart >= intervalMs;
      }

      // No interval restriction or no completed instances - can start
      return true;
    }

    // Unknown frequency type - default to not starting
    return false;
  }

  /**
   * Try to start a new workflow instance for a subject
   * Only saves context if the workflow actually started (start node accepted the event)
   * @param workflowDef - The workflow definition
   * @param event - The triggering event
   * @param domain - The domain identifier
   * @param subjectId - The subject ID
   */
  private async tryStartNewWorkflowInstance(
    workflowDef: Workflow,
    event: Event,
    domain: string,
    subjectId: string
  ): Promise<void> {
    const workflow = new WorkflowModel(workflowDef, this.nodeModels);
    workflow.start();

    const startNode = workflow.getStartNode();

    try {
      await workflow.acceptEvent(event);
    } catch (error) {
      console.error(
        `Error accepting event in workflow ${workflowDef.id}:`,
        error
      );
      throw error;
    }

    // If workflow is still waiting on the start node, it wasn't triggered by this event
    if (
      workflow.getStatus() === WorkflowStatus.Waiting &&
      workflow.getCurrentNode()?.equals(startNode)
    ) {
      return;
    }

    const context = workflow.getContext();
    await this.workflowMemory.saveContext(
      domain,
      workflowDef.id,
      subjectId,
      context
    );
  }

  /**
   * Resume an existing workflow instance and process an event
   * @param workflowDef - The workflow definition
   * @param context - The existing context
   * @param event - The event to process
   * @param domain - The domain identifier
   * @param subjectId - The subject ID
   */
  private async resumeWorkflowInstance(
    workflowDef: Workflow,
    context: Context,
    event: Event,
    domain: string,
    subjectId: string
  ): Promise<void> {
    const workflow = new WorkflowModel(workflowDef, this.nodeModels);
    workflow.setContext(context);
    workflow.start();

    try {
      await workflow.acceptEvent(event);
    } catch (error) {
      console.error(
        `Error accepting event in workflow ${workflowDef.id}:`,
        error
      );
      throw error;
    }

    const updatedContext = workflow.getContext();
    await this.workflowMemory.saveContext(
      domain,
      workflowDef.id,
      subjectId,
      updatedContext
    );
  }

  /**
   * Get the workflow scheduler instance
   * Useful for nodes that need to schedule future events
   * @returns The workflow scheduler
   */
  getScheduler(): WorkflowScheduler {
    return this.workflowScheduler;
  }
}
