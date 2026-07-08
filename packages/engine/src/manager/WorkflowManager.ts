import {
  type Event,
  type EventDelivery,
  type Workflow,
  type Context,
  type ContextSubscription,
  WorkflowStatus,
} from "@omega-flow/types";
import type { WorkflowStore } from "./WorkflowStore";
import type { WorkflowMemory } from "./WorkflowMemory";
import type { WorkflowScheduler } from "./WorkflowScheduler";
import {
  createDeliveryEvent,
  type Subscription,
  type SubscriptionStore,
} from "./SubscriptionStore";
import WorkflowModel from "../engine/WorkflowModel";
import type NodeModel from "../engine/NodeModel";

/** Default subscription TTL safety net when a node gives no ttlSeconds hint. */
const DEFAULT_SUBSCRIPTION_TTL_SECONDS = 90 * 24 * 60 * 60; // 90 days

/**
 * Constructor type for a NodeModel subclass.
 * Re-exported from `@omega-flow/engine` as `NodeModelClass`.
 */
export type NodeModelClass = typeof NodeModel;

/**
 * Map of node type names to their NodeModel classes.
 * Re-exported from `@omega-flow/engine` as `NodeModelRegistry`.
 */
export type NodeModelRegistry = Record<string, NodeModelClass>;

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
  nodeModels: NodeModelRegistry;
  /**
   * Storage backend for cross-subject event subscriptions.
   * Optional — when absent, event subscriptions are disabled and the manager
   * behaves exactly as before (zero behavior change for existing setups).
   */
  subscriptionStore?: SubscriptionStore;
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
  private nodeModels: NodeModelRegistry;
  /** Optional storage backend for cross-subject event subscriptions */
  private subscriptionStore?: SubscriptionStore;
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
    this.subscriptionStore = config.subscriptionStore;
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
      // Skip disabled workflows. Backward-compatible: only an explicit
      // `enabled === false` disables; `undefined` keeps existing workflows
      // running. This is a hard off — neither new instances are started nor
      // active ones resumed; their contexts are preserved and resume if the
      // workflow is re-enabled.
      if (workflowDef.options.enabled === false) {
        continue;
      }

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
    const workflow = new WorkflowModel(workflowDef, this.nodeModels, { scheduler: this.workflowScheduler });
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

    await this.persistInstance(workflow, domain, workflowDef.id, subjectId);
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
    const workflow = new WorkflowModel(workflowDef, this.nodeModels, { scheduler: this.workflowScheduler });
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

    await this.persistInstance(workflow, domain, workflowDef.id, subjectId);
  }

  /**
   * Persist a workflow instance and synchronize its event subscriptions.
   *
   * Without a subscriptionStore this is a plain saveContext. With one, the
   * parked node's declared subscription (via `NodeModel.getSubscription`) is
   * diffed against the subscriptions recorded on the context:
   * - new subscriptions are registered BEFORE the context is saved — a crash
   *   in between leaves an orphan subscription (harmless: dropped on delivery
   *   and TTL-cleaned), never a parked instance nobody can resume;
   * - stale subscriptions (node advanced, instance completed, timeout fired)
   *   are deleted AFTER the save, for the same reason.
   *
   * @param workflow - The workflow model after event processing
   * @param domain - The domain identifier
   * @param workflowId - The workflow definition id
   * @param subjectId - The subject the instance lives under
   */
  private async persistInstance(
    workflow: WorkflowModel,
    domain: string,
    workflowId: string,
    subjectId: string
  ): Promise<void> {
    const context = workflow.getContext();

    if (!this.subscriptionStore) {
      await this.workflowMemory.saveContext(
        domain,
        workflowId,
        subjectId,
        context
      );
      return;
    }

    const previous = context.subscriptions ?? [];
    const desired: ContextSubscription[] = [];
    let ttlSeconds: number | undefined;

    if (!context.isCompleted && context.currentNodeId) {
      const node = workflow.getNode(context.currentNodeId);
      const request = node ? node.getSubscription(context) : null;
      if (request) {
        desired.push({
          eventType: request.eventType,
          matchSubjectId: request.matchSubjectId,
          nodeId: context.currentNodeId,
        });
        ttlSeconds = request.ttlSeconds;
      }
    }

    const sameSubscription = (a: ContextSubscription, b: ContextSubscription) =>
      a.eventType === b.eventType &&
      a.matchSubjectId === b.matchSubjectId &&
      a.nodeId === b.nodeId;

    const toAdd = desired.filter(
      (d) => !previous.some((p) => sameSubscription(p, d))
    );
    const toRemove = previous.filter(
      (p) => !desired.some((d) => sameSubscription(p, d))
    );

    for (const sub of toAdd) {
      await this.subscriptionStore.put({
        domain,
        eventType: sub.eventType,
        matchSubjectId: sub.matchSubjectId,
        workflowId,
        subjectId,
        instanceId: context.instanceId,
        nodeId: sub.nodeId,
        createdAt: Date.now(),
        ttl:
          Math.floor(Date.now() / 1000) +
          (ttlSeconds ?? DEFAULT_SUBSCRIPTION_TTL_SECONDS),
      });
    }

    context.subscriptions = desired.length > 0 ? desired : undefined;
    await this.workflowMemory.saveContext(
      domain,
      workflowId,
      subjectId,
      context
    );

    if (toRemove.length > 0) {
      await this.subscriptionStore.delete(
        toRemove.map((sub) => ({
          domain,
          eventType: sub.eventType,
          matchSubjectId: sub.matchSubjectId,
          workflowId,
          subjectId,
          instanceId: context.instanceId,
          nodeId: sub.nodeId,
        }))
      );
    }
  }

  /**
   * Find subscriptions matching an event: subscriptions in this event's
   * domain, for this event's type, whose matchSubjectId equals the event's own
   * subject id — plus wildcard subscriptions for the same event type.
   *
   * Call this after `processEvent` and relay a delivery copy of the event
   * (see `createDeliveryEvent`) to each returned subscription — either
   * synchronously via `deliverEvent` (single-process setups) or through a
   * queue that serializes it with the subscriber's own events.
   *
   * Returns an empty array when no subscriptionStore is configured, and for
   * delivery events (a delivered copy must not fan out again).
   *
   * @param event - The event to match against registered subscriptions
   * @returns Matching subscriptions (possibly empty)
   */
  async matchSubscriptions(event: Event): Promise<Subscription[]> {
    if (!this.subscriptionStore) {
      return [];
    }
    if (event.data?.delivery) {
      return [];
    }
    const [domain, subjectId] = this.eventExtractor(event);
    return this.subscriptionStore.match(domain, event.type, subjectId);
  }

  /**
   * Build the delivery copy of an event for one matched subscription:
   * the event retargeted at the subscriber's subject, carrying
   * `data.delivery` metadata (see `createDeliveryEvent` for the shape).
   *
   * @param event - The original event that matched the subscription
   * @param subscription - The matched subscription
   * @returns The event copy to relay to the subscriber
   */
  createDeliveryEvent(event: Event, subscription: Subscription): Event {
    const [, sourceSubjectId] = this.eventExtractor(event);
    return createDeliveryEvent(event, subscription, sourceSubjectId);
  }

  /**
   * Deliver an event to one specific workflow instance (targeted resume).
   *
   * Unlike `processEvent`, this never starts new instances and never touches
   * any other instance: it loads exactly the addressed context, lets the
   * parked node accept the event, and persists the result (including
   * subscription cleanup). Used to resume instances across subject spaces
   * after a subscription match.
   *
   * The delivery is dropped (with a log, returning false) when the workflow
   * or instance is gone, the instance already completed, or it is no longer
   * parked on the node recorded in `event.data.delivery.nodeId` — this makes
   * redelivery of the same event idempotent.
   *
   * @param domain - The domain identifier
   * @param workflowId - The workflow definition id
   * @param subjectId - The subject the target instance lives under
   * @param instanceId - The target workflow instance
   * @param event - The event to deliver (typically a delivery copy carrying
   *          `data.delivery`)
   * @returns True if the instance was resumed, false if the delivery was dropped
   */
  async deliverEvent(
    domain: string,
    workflowId: string,
    subjectId: string,
    instanceId: string,
    event: Event
  ): Promise<boolean> {
    const target = `${domain}/${workflowId}/${subjectId}/${instanceId}`;

    const workflowDef = await this.workflowStore.getWorkflow(
      domain,
      workflowId
    );
    if (!workflowDef) {
      console.warn(`deliverEvent: workflow not found, dropping (${target})`);
      return false;
    }
    if (workflowDef.options.enabled === false) {
      console.warn(`deliverEvent: workflow disabled, dropping (${target})`);
      return false;
    }

    const contexts = await this.workflowMemory.getContexts(
      domain,
      workflowId,
      subjectId
    );
    const context = contexts.find((ctx) => ctx.instanceId === instanceId);
    if (!context) {
      console.warn(`deliverEvent: instance not found, dropping (${target})`);
      return false;
    }
    if (context.isCompleted) {
      console.warn(
        `deliverEvent: instance already completed, dropping (${target})`
      );
      return false;
    }

    const delivery = event.data?.delivery as EventDelivery | undefined;
    if (delivery?.nodeId && context.currentNodeId !== delivery.nodeId) {
      console.warn(
        `deliverEvent: instance no longer parked on node ${delivery.nodeId}, dropping (${target})`
      );
      return false;
    }

    const workflow = new WorkflowModel(workflowDef, this.nodeModels, {
      scheduler: this.workflowScheduler,
    });
    workflow.setContext(context);
    workflow.start();

    const nodeIdBefore = context.currentNodeId;
    try {
      await workflow.acceptEvent(event);
    } catch (error) {
      console.error(
        `Error delivering event to workflow ${workflowId} (${target}):`,
        error
      );
      throw error;
    }

    const updatedContext = workflow.getContext();
    const resumed =
      updatedContext.isCompleted === true ||
      updatedContext.currentNodeId !== nodeIdBefore;

    await this.persistInstance(workflow, domain, workflowId, subjectId);
    return resumed;
  }

  /**
   * Get the workflow scheduler instance
   * Useful for nodes that need to schedule future events
   * @returns The workflow scheduler
   */
  getScheduler(): WorkflowScheduler {
    return this.workflowScheduler;
  }

  /**
   * Get the subscription store instance, if one is configured
   * @returns The subscription store, or undefined when subscriptions are disabled
   */
  getSubscriptionStore(): SubscriptionStore | undefined {
    return this.subscriptionStore;
  }
}
