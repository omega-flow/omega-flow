import type { Event, EventDelivery } from "@omega-flow/types";

/**
 * Match subject id of a wildcard subscription — matches any subject in the
 * subscribed event type's space.
 */
export const SUBSCRIPTION_WILDCARD = "*";

/**
 * A registered event subscription: "instance I (domain, workflow, subject)
 * wants events of type `eventType` whose source subject id equals
 * `matchSubjectId`" (or any subject, for wildcard subscriptions).
 *
 * Subscriptions are the cross-subject resume mechanism: they let an instance
 * parked in one subject space (e.g. `client:5`) be resumed by an event that
 * is routed to another subject space (e.g. `product:456`).
 */
export interface Subscription {
  /** Domain (tenant) the subscription belongs to */
  domain: string;
  /** Event type the instance is waiting for (e.g. `product.update`) */
  eventType: string;
  /**
   * Subject id of the source event (e.g. `product:456`), or `"*"` for a
   * wildcard subscription.
   */
  matchSubjectId: string;
  /** Workflow the subscribing instance belongs to */
  workflowId: string;
  /** Subject the subscribing instance lives under (e.g. `client:5`) */
  subjectId: string;
  /** The subscribing workflow instance */
  instanceId: string;
  /** The parked node that declared the subscription */
  nodeId: string;
  /** Unix timestamp (ms) when the subscription was registered */
  createdAt: number;
  /**
   * Unix timestamp (seconds) after which the subscription may be discarded.
   * A safety net against orphans (crash between registration and context
   * save), not the primary cleanup — the WorkflowManager deletes
   * subscriptions explicitly when the instance advances.
   */
  ttl?: number;
}

/** Identifying fields of a subscription (everything except createdAt/ttl). */
export type SubscriptionRef = Omit<Subscription, "createdAt" | "ttl">;

/**
 * Primary key of a subscription: all instances waiting for the same
 * (domain, eventType, matchSubjectId) share one key.
 */
export function subscriptionKey(sub: SubscriptionRef): string {
  return `${sub.domain}#${sub.eventType}#${sub.matchSubjectId}`;
}

/**
 * Sort key of a subscription: identifies the one parked node of the one
 * instance that registered it.
 */
export function subscriptionTarget(sub: SubscriptionRef): string {
  return `${sub.workflowId}#${sub.subjectId}#${sub.instanceId}#${sub.nodeId}`;
}

/**
 * Storage backend for event subscriptions.
 *
 * Configure it on the WorkflowManager via `WorkflowManagerConfig.subscriptionStore`
 * to enable cross-subject event subscriptions; when absent the feature is off
 * and the engine behaves exactly as before.
 */
export interface SubscriptionStore {
  /**
   * Register a subscription. Registering the same subscription
   * (same key + target) again overwrites it.
   */
  put(subscription: Subscription): Promise<void>;

  /**
   * Find subscriptions for (domain, eventType) whose matchSubjectId equals the
   * given value, plus wildcard (`"*"`) subscriptions for the same event type.
   * Expired entries (ttl in the past) must not be returned.
   * @param matchSubjectId - Subject id of the incoming event (e.g. `product:456`)
   */
  match(
    domain: string,
    eventType: string,
    matchSubjectId: string
  ): Promise<Subscription[]>;

  /**
   * Delete the given subscriptions. Missing entries are ignored.
   */
  delete(subscriptions: SubscriptionRef[]): Promise<void>;
}

/**
 * Build the delivery copy of an event for one matched subscription.
 *
 * The copy is retargeted at the subscriber: `data.subjectId` is set to the
 * subscriber's own subject (so transports and eventExtractors group it with
 * the subscriber's events) and `data.delivery` carries the target instance,
 * so consumers know to call `WorkflowManager.deliverEvent` instead of
 * `processEvent`.
 *
 * @param event - The original event that matched the subscription
 * @param subscription - The matched subscription
 * @param sourceSubjectId - Subject id the original event was routed to
 */
export function createDeliveryEvent(
  event: Event,
  subscription: SubscriptionRef,
  sourceSubjectId: string
): Event {
  const delivery: EventDelivery = {
    workflowId: subscription.workflowId,
    instanceId: subscription.instanceId,
    nodeId: subscription.nodeId,
    sourceSubjectId,
  };
  return {
    ...event,
    data: {
      ...(event.data ?? {}),
      subjectId: subscription.subjectId,
      delivery,
    },
  };
}
