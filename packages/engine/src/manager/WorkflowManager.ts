import {
  type Event,
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
   * Function to derive domain and subject ID from an event that does not
   * carry them explicitly.
   *
   * Routing precedence: when an event has top-level `domain` and `subjectId`
   * (explicit envelope routing — e.g. set at ingest, or on delivery copies
   * created by the engine), those always win and this function is not called.
   * The extractor is the fallback for events that arrive without explicit
   * routing (e.g. raw webhooks). Optional — a host that sets the envelope
   * fields on every event needs no extractor; routing an event that has
   * neither is an error.
   *
   * @param event - The incoming event
   * @returns Tuple of [domain, subjectId]
   */
  eventExtractor?: (event: Event) => [string, string];
}

/**
 * One delivery scheduled by `processEvent` for a matched subscription.
 * The delivery copy travels through the configured `workflowScheduler`
 * (delay 0) and resumes the target instance when it comes back through
 * `processEvent`.
 */
export interface ScheduledDelivery {
  /** Schedule id returned by the workflowScheduler */
  scheduleId: string;
  /** Workflow of the subscribing instance */
  workflowId: string;
  /** Subject the subscribing instance lives under (e.g. `client:5`) */
  subjectId: string;
  /** The subscribing workflow instance */
  instanceId: string;
  /** The parked node that declared the subscription */
  nodeId: string;
  /** The subscription's match subject id (`"*"` for wildcard) */
  matchSubjectId: string;
}

/**
 * Result of `processEvent`.
 */
export interface ProcessEventResult {
  /**
   * Present only when the event was a delivery copy (`event.delivery`):
   * true if the target instance was resumed, false if the delivery was
   * dropped (instance gone / completed / no longer parked on the node).
   */
  delivered?: boolean;
  /**
   * Deliveries scheduled for subscriptions matched by this event
   * (always empty for delivery copies — no fan-out of copies).
   */
  deliveries: ScheduledDelivery[];
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
 *   // fallback for events without top-level domain/subjectId:
 *   eventExtractor: (event) => [event.data.domain, event.data.userId],
 * });
 *
 * // The single entry point for every incoming message — including delivery
 * // copies relayed by the scheduler for cross-subject subscriptions.
 * await manager.processEvent({ id, type: 'user_signup', time: Date.now(), data: {...} });
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
  /** Fallback for events without explicit envelope routing */
  private eventExtractor?: (event: Event) => [string, string];

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
   * Resolve an event's routing. Explicit envelope fields (`event.domain` +
   * `event.subjectId`) always win; the configured `eventExtractor` is the
   * fallback for events that don't carry them. This precedence is what makes
   * engine-created delivery copies self-routing under any host configuration.
   */
  private resolveRouting(event: Event): [string, string] {
    if (event.domain != null && event.subjectId != null) {
      return [event.domain, event.subjectId];
    }
    if (this.eventExtractor) {
      return this.eventExtractor(event);
    }
    throw new Error(
      `Cannot route event ${event.id} (${event.type}): it carries no domain/subjectId and no eventExtractor is configured`
    );
  }

  /**
   * Process an event — the single entry point for every incoming message.
   *
   * - A delivery copy (`event.delivery` present) is routed straight to
   *   the targeted resume (`deliverEvent`) of exactly one instance; normal
   *   matching never runs for it.
   * - Any other event is routed to the workflows of its subject as before;
   *   afterwards, if a subscriptionStore is configured, subscriptions
   *   matching the event are looked up and one delivery copy per subscriber
   *   is scheduled through the workflowScheduler (delay 0) — the copy comes
   *   back through `processEvent` in the subscriber's own ordering scope.
   *
   * @param event - The event to process
   * @returns What happened: `delivered` for delivery copies, `deliveries`
   *          scheduled for matched subscriptions
   */
  async processEvent(event: Event): Promise<ProcessEventResult> {
    const delivery = event.delivery;
    if (delivery) {
      const [domain, subjectId] = this.resolveRouting(event);
      const delivered = await this.deliverEvent(
        domain,
        delivery.workflowId,
        subjectId,
        delivery.instanceId,
        event
      );
      return { delivered, deliveries: [] };
    }

    // Extract domain and subject ID from the event
    const [domain, subjectId] = this.resolveRouting(event);

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

    // Cross-subject subscriptions: schedule one delivery copy per subscriber.
    // Errors propagate — an at-least-once transport retries the whole
    // message; duplicate schedules are absorbed by transport dedup and
    // deliverEvent's idempotency.
    const deliveries = await this.scheduleDeliveries(event);
    return { deliveries };
  }

  /**
   * Match an event against registered subscriptions and schedule one
   * delivery copy per subscriber through the workflowScheduler (delay 0).
   * No-op (empty result) when subscriptions are off or nothing matches.
   */
  private async scheduleDeliveries(event: Event): Promise<ScheduledDelivery[]> {
    const matches = await this.matchSubscriptions(event);
    const deliveries: ScheduledDelivery[] = [];

    for (const subscription of matches) {
      const deliveryEvent = this.createDeliveryEvent(event, subscription);
      const scheduleId = await this.workflowScheduler.schedule(
        deliveryEvent,
        0
      );
      deliveries.push({
        scheduleId,
        workflowId: subscription.workflowId,
        subjectId: subscription.subjectId,
        instanceId: subscription.instanceId,
        nodeId: subscription.nodeId,
        matchSubjectId: subscription.matchSubjectId,
      });
    }

    return deliveries;
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

    // Remove the key entirely when empty: assigning `undefined` breaks
    // storage backends that reject undefined values (e.g. DynamoDB marshalling).
    if (desired.length > 0) {
      context.subscriptions = desired;
    } else {
      delete context.subscriptions;
    }
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
   * Internal step of `processEvent`, which calls this and schedules the
   * deliveries automatically.
   *
   * Returns an empty array when no subscriptionStore is configured, and for
   * delivery events (a delivered copy must not fan out again).
   *
   * @param event - The event to match against registered subscriptions
   * @returns Matching subscriptions (possibly empty)
   */
  private async matchSubscriptions(event: Event): Promise<Subscription[]> {
    if (!this.subscriptionStore) {
      return [];
    }
    if (event.delivery) {
      return [];
    }
    const [domain, subjectId] = this.resolveRouting(event);
    return this.subscriptionStore.match(domain, event.type, subjectId);
  }

  /**
   * Build the delivery copy of an event for one matched subscription:
   * the event retargeted at the subscriber via the envelope (top-level
   * `domain`/`subjectId`/`delivery` — see the standalone
   * `createDeliveryEvent` for the shape). Internal step of `processEvent`.
   *
   * @param event - The original event that matched the subscription
   * @param subscription - The matched subscription
   * @returns The event copy to relay to the subscriber
   */
  private createDeliveryEvent(event: Event, subscription: Subscription): Event {
    const [, sourceSubjectId] = this.resolveRouting(event);
    return createDeliveryEvent(event, subscription, sourceSubjectId);
  }

  /**
   * Deliver an event to one specific workflow instance (targeted resume).
   *
   * Unlike normal routing, this never starts new instances and never touches
   * any other instance: it loads exactly the addressed context, lets the
   * parked node accept the event, and persists the result (including
   * subscription cleanup). Internal step of `processEvent`, which calls this
   * for delivery copies (`event.delivery`).
   *
   * The delivery is dropped (with a log, returning false) when the workflow
   * or instance is gone, the instance already completed, or it is no longer
   * parked on the node recorded in `event.delivery.nodeId` — this makes
   * redelivery of the same event idempotent.
   *
   * @param domain - The domain identifier
   * @param workflowId - The workflow definition id
   * @param subjectId - The subject the target instance lives under
   * @param instanceId - The target workflow instance
   * @param event - The event to deliver (typically a delivery copy carrying
   *          `event.delivery`)
   * @returns True if the instance was resumed, false if the delivery was dropped
   */
  private async deliverEvent(
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

    const delivery = event.delivery;
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
