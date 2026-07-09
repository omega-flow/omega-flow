import { type DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DeleteCommand,
  DynamoDBDocumentClient,
  PutCommand,
  QueryCommand,
} from "@aws-sdk/lib-dynamodb";
import {
  SUBSCRIPTION_WILDCARD,
  subscriptionKey,
  subscriptionTarget,
  type Subscription,
  type SubscriptionRef,
  type SubscriptionStore,
} from "@omega-flow/engine";

export interface DynamoDBSubscriptionStoreConfig {
  client: DynamoDBClient;
  tableName: string;
}

interface SubscriptionItem {
  subscriptionKey: string;
  target: string;
  domain: string;
  eventType: string;
  matchSubjectId: string;
  workflowId: string;
  subjectId: string;
  instanceId: string;
  nodeId: string;
  createdAt: number;
  ttl?: number;
}

/**
 * DynamoDB-backed implementation of SubscriptionStore.
 *
 * Table layout (dedicated subscriptions table):
 *   subscriptionKey (pk) = `${domain}#${eventType}#${matchSubjectId}`
 *   target (sk)          = `${workflowId}#${subjectId}#${instanceId}#${nodeId}`
 *   domain, eventType, matchSubjectId, workflowId, subjectId, instanceId, nodeId
 *                        = denormalised subscription fields
 *   createdAt            = epoch ms, set on registration
 *   ttl                  = epoch seconds; enable DynamoDB TTL on this
 *                          attribute as the orphan-cleanup safety net
 *
 * Matching an event is two cheap exact-key Queries: one for the event's own
 * subject id and one for wildcard (`*`) subscriptions — both usually empty.
 * No GSI is needed: reverse cleanup (instance -> its subscriptions) uses the
 * subscription keys recorded on the Context by the WorkflowManager.
 *
 * Assumes domain / eventType do not contain '#'.
 */
export class DynamoDBSubscriptionStore implements SubscriptionStore {
  private docClient: DynamoDBDocumentClient;
  private tableName: string;

  constructor(config: DynamoDBSubscriptionStoreConfig) {
    this.docClient = DynamoDBDocumentClient.from(config.client, {
      // Contexts/items may carry optional fields set to undefined (e.g. a
      // cleared context.subscriptions); drop them instead of throwing.
      marshallOptions: { removeUndefinedValues: true },
    });
    this.tableName = config.tableName;
  }

  async put(subscription: Subscription): Promise<void> {
    const item: SubscriptionItem = {
      subscriptionKey: subscriptionKey(subscription),
      target: subscriptionTarget(subscription),
      domain: subscription.domain,
      eventType: subscription.eventType,
      matchSubjectId: subscription.matchSubjectId,
      workflowId: subscription.workflowId,
      subjectId: subscription.subjectId,
      instanceId: subscription.instanceId,
      nodeId: subscription.nodeId,
      createdAt: subscription.createdAt,
      ttl: subscription.ttl,
    };

    await this.docClient.send(
      new PutCommand({
        TableName: this.tableName,
        Item: item,
      })
    );
  }

  async match(
    domain: string,
    eventType: string,
    matchSubjectId: string
  ): Promise<Subscription[]> {
    const keys = new Set([
      `${domain}#${eventType}#${matchSubjectId}`,
      `${domain}#${eventType}#${SUBSCRIPTION_WILDCARD}`,
    ]);

    const subscriptions: Subscription[] = [];
    // DynamoDB TTL deletes lazily (can lag by up to ~48h), so expired items
    // are filtered out of the query results as well.
    const nowSeconds = Math.floor(Date.now() / 1000);

    for (const key of keys) {
      let lastKey: Record<string, unknown> | undefined;
      do {
        const result = await this.docClient.send(
          new QueryCommand({
            TableName: this.tableName,
            KeyConditionExpression: "subscriptionKey = :subscriptionKey",
            FilterExpression: "attribute_not_exists(#ttl) OR #ttl > :now",
            ExpressionAttributeNames: { "#ttl": "ttl" },
            ExpressionAttributeValues: {
              ":subscriptionKey": key,
              ":now": nowSeconds,
            },
            ExclusiveStartKey: lastKey,
          })
        );
        for (const item of result.Items ?? []) {
          const sub = item as SubscriptionItem;
          subscriptions.push({
            domain: sub.domain,
            eventType: sub.eventType,
            matchSubjectId: sub.matchSubjectId,
            workflowId: sub.workflowId,
            subjectId: sub.subjectId,
            instanceId: sub.instanceId,
            nodeId: sub.nodeId,
            createdAt: sub.createdAt,
            ttl: sub.ttl,
          });
        }
        lastKey = result.LastEvaluatedKey;
      } while (lastKey);
    }

    return subscriptions;
  }

  async delete(subscriptions: SubscriptionRef[]): Promise<void> {
    // Delete sets are tiny (a parked node registers one subscription), so
    // individual deletes are simpler than BatchWrite and idempotent for free.
    for (const ref of subscriptions) {
      await this.docClient.send(
        new DeleteCommand({
          TableName: this.tableName,
          Key: {
            subscriptionKey: subscriptionKey(ref),
            target: subscriptionTarget(ref),
          },
        })
      );
    }
  }
}
