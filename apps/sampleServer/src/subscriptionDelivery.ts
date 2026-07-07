import type { WorkflowManager } from "@omega-flow/engine";
import type { Event } from "@omega-flow/types";

/**
 * One delivery attempt reported back to the API caller.
 */
export interface DeliveryResult {
  workflowId: string;
  subjectId: string;
  instanceId: string;
  nodeId: string;
  matchValue: string;
  /** True when the target instance was actually resumed, false when dropped */
  resumed: boolean;
}

/**
 * Match an already-processed event against registered subscriptions and
 * deliver a copy to each subscriber.
 *
 * The sample server is single-process, so deliveries happen synchronously
 * via `manager.deliverEvent` — no queue hop is needed. This exercises the
 * same engine code path (match -> delivery event -> targeted resume) that a
 * production consumer runs after relaying delivery messages through a FIFO
 * queue.
 */
export async function deliverToSubscribers(
  manager: WorkflowManager,
  domain: string,
  event: Event
): Promise<DeliveryResult[]> {
  const matches = await manager.matchSubscriptions(event);
  const deliveries: DeliveryResult[] = [];

  for (const subscription of matches) {
    const deliveryEvent = manager.createDeliveryEvent(event, subscription);
    const resumed = await manager.deliverEvent(
      domain,
      subscription.workflowId,
      subscription.subjectId,
      subscription.instanceId,
      deliveryEvent
    );
    deliveries.push({
      workflowId: subscription.workflowId,
      subjectId: subscription.subjectId,
      instanceId: subscription.instanceId,
      nodeId: subscription.nodeId,
      matchValue: subscription.matchValue,
      resumed,
    });
  }

  return deliveries;
}
