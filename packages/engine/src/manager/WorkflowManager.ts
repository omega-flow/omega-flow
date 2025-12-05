import type { Event, Workflow, Context } from "@omega-flow/types";
import type { WorkflowStore } from "./WorkflowStore";
import type { WorkflowMemory } from "./WorkflowMemory";
import type { WorkflowScheduler } from "./WorkflowScheduler";
import WorkflowModel from "../engine/WorkflowModel";
import type NodeModel from "../engine/NodeModel";

export interface WorkflowManagerConfig {
  workflowStore: WorkflowStore;
  workflowMemory: WorkflowMemory;
  workflowScheduler: WorkflowScheduler;
  nodeModels: Record<string, typeof NodeModel>;
  /**
   * Extract domain and subject ID from event
   * Returns [domain, subjectId]
   */
  eventExtractor: (event: Event) => [string, string];
}

/**
 * Manages multiple workflows and their execution
 * Handles workflow lifecycle, state persistence, and event routing
 */
export class WorkflowManager {
  private workflowStore: WorkflowStore;
  private workflowMemory: WorkflowMemory;
  private workflowScheduler: WorkflowScheduler;
  private nodeModels: Record<string, typeof NodeModel>;
  private eventExtractor: (event: Event) => [string, string];

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

    // Check if we should start a new instance based on trigger and frequency
    if (this.isTriggeredByEvent(workflowDef, event)) {
      const canStartNew = this.canStartNewInstance(
        workflowDef,
        activeContexts,
        completedContexts
      );

      if (canStartNew) {
        await this.startNewWorkflowInstance(
          workflowDef,
          event,
          domain,
          subjectId
        );
      }
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
   * Start a new workflow instance for a subject
   * @param workflowDef - The workflow definition
   * @param event - The triggering event
   * @param domain - The domain identifier
   * @param subjectId - The subject ID
   */
  private async startNewWorkflowInstance(
    workflowDef: Workflow,
    event: Event,
    domain: string,
    subjectId: string
  ): Promise<void> {
    const workflow = new WorkflowModel(workflowDef, this.nodeModels);
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
   * Check if a workflow is triggered by a specific event
   * Examines the start node of the workflow to determine if it accepts this event
   * @param workflow - The workflow definition
   * @param event - The event to check
   * @returns true if the workflow should be triggered by this event
   */
  private isTriggeredByEvent(workflow: Workflow, event: Event): boolean {
    // Find the start node (node with no incoming edges)
    const startNodeDef = workflow.flow.nodes.find((node) => {
      return !workflow.flow.edges.some(
        (edge) => String(edge.target) === String(node.id)
      );
    });

    if (!startNodeDef) {
      return false; // No start node found
    }

    // Check if start node is a Trigger node with matching event type
    if (startNodeDef.type === "Trigger") {
      const nodeData = startNodeDef.data as any;
      if (nodeData?.params?.event === event.type) {
        return true;
      }
    }

    return false;
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
