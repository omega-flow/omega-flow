import {
  SUBSCRIPTION_WILDCARD,
  subscriptionKey,
  subscriptionTarget,
  type Subscription,
  type SubscriptionRef,
  type SubscriptionStore,
} from "../SubscriptionStore";

/**
 * In-memory implementation of SubscriptionStore.
 *
 * Stores subscriptions in a nested Map keyed by subscription key
 * (`domain#eventType#matchSubjectId`) and target
 * (`workflowId#subjectId#instanceId#nodeId`).
 * Useful for testing, development, and single-instance deployments.
 */
export class InMemorySubscriptionStore implements SubscriptionStore {
  /** Map of subscription key -> target -> subscription */
  private subscriptions: Map<string, Map<string, Subscription>>;

  /**
   * Creates a new InMemorySubscriptionStore with empty storage.
   */
  constructor() {
    this.subscriptions = new Map();
  }

  /**
   * Register a subscription (overwrites an existing key + target pair).
   */
  async put(subscription: Subscription): Promise<void> {
    const key = subscriptionKey(subscription);
    let targets = this.subscriptions.get(key);
    if (!targets) {
      targets = new Map();
      this.subscriptions.set(key, targets);
    }
    targets.set(subscriptionTarget(subscription), { ...subscription });
  }

  /**
   * Find subscriptions matching (domain, eventType, matchSubjectId), including
   * wildcard subscriptions. Expired entries are pruned and never returned.
   */
  async match(
    domain: string,
    eventType: string,
    matchSubjectId: string
  ): Promise<Subscription[]> {
    const keys = new Set([
      `${domain}#${eventType}#${matchSubjectId}`,
      `${domain}#${eventType}#${SUBSCRIPTION_WILDCARD}`,
    ]);
    const nowSeconds = Math.floor(Date.now() / 1000);
    const result: Subscription[] = [];

    for (const key of keys) {
      const targets = this.subscriptions.get(key);
      if (!targets) {
        continue;
      }
      for (const [target, subscription] of targets) {
        if (subscription.ttl !== undefined && subscription.ttl <= nowSeconds) {
          targets.delete(target);
          continue;
        }
        result.push(subscription);
      }
      if (targets.size === 0) {
        this.subscriptions.delete(key);
      }
    }

    return result;
  }

  /**
   * Delete the given subscriptions. Missing entries are ignored.
   */
  async delete(subscriptions: SubscriptionRef[]): Promise<void> {
    for (const ref of subscriptions) {
      const key = subscriptionKey(ref);
      const targets = this.subscriptions.get(key);
      if (!targets) {
        continue;
      }
      targets.delete(subscriptionTarget(ref));
      if (targets.size === 0) {
        this.subscriptions.delete(key);
      }
    }
  }

  /**
   * List all stored subscriptions (for tests and debugging).
   */
  getAll(): Subscription[] {
    const all: Subscription[] = [];
    for (const targets of this.subscriptions.values()) {
      all.push(...targets.values());
    }
    return all;
  }

  /**
   * Clear all subscriptions from memory.
   */
  async clear(): Promise<void> {
    this.subscriptions.clear();
  }
}
