import {
  ConditionalCheckFailedException,
  type DynamoDBClient,
} from "@aws-sdk/client-dynamodb";
import {
  DeleteCommand,
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  QueryCommand,
} from "@aws-sdk/lib-dynamodb";
import type { WorkflowMemory } from "@omega-flow/engine";
import type { Context } from "@omega-flow/types";
import { OptimisticLockError } from "../errors";

export interface DynamoDBWorkflowMemoryConfig {
  client: DynamoDBClient;
  tableName: string;
  /**
   * Name of the GSI with `domain` as partition key and `subjectId` as sort key.
   * Required for `getAllContexts` and `getAllContextsForSubject`.
   * Defaults to `domain-subjectId-index`.
   */
  gsiName?: string;
}

interface ContextItem {
  contextKey: string;
  instanceId: string;
  domain: string;
  subjectId: string;
  data: Context;
  isCompleted: boolean;
  startedAt: number;
  updatedAt: number;
  /**
   * Optimistic-lock version. Mirrored from `data.version`; incremented on every
   * save and used as the conditional-write guard. Starts at 1 for a new item.
   */
  version: number;
}

/**
 * DynamoDB-backed implementation of WorkflowMemory.
 *
 * Table layout (dedicated contexts table):
 *   contextKey (pk) = `${domain}#${workflowId}#${subjectId}`
 *   instanceId (sk) = workflow instance id
 *   domain = tenant identifier (denormalised for GSI)
 *   subjectId = subject identifier (denormalised for GSI)
 *   data = full Context JSON
 *   isCompleted, startedAt = mirrored from Context for filtering/sorting
 *   updatedAt = epoch ms, set on every save
 *
 * GSI (domain-subjectId-index):
 *   domain (pk), subjectId (sk) — enables getAllContexts and getAllContextsForSubject queries.
 *
 * Assumes domain / workflowId / subjectId do not contain '#'.
 */
export class DynamoDBWorkflowMemory implements WorkflowMemory {
  private docClient: DynamoDBDocumentClient;
  private tableName: string;
  private gsiName: string;

  constructor(config: DynamoDBWorkflowMemoryConfig) {
    this.docClient = DynamoDBDocumentClient.from(config.client, {
      // Contexts/items may carry optional fields set to undefined (e.g. a
      // cleared context.subscriptions); drop them instead of throwing.
      marshallOptions: { removeUndefinedValues: true },
    });
    this.tableName = config.tableName;
    this.gsiName = config.gsiName ?? "domain-subjectId-index";
  }

  private buildContextKey(
    domain: string,
    workflowId: string,
    subjectId: string
  ): string {
    return `${domain}#${workflowId}#${subjectId}`;
  }

  async getContexts(
    domain: string,
    workflowId: string,
    subjectId: string
  ): Promise<Context[]> {
    const contextKey = this.buildContextKey(domain, workflowId, subjectId);
    const contexts: Context[] = [];
    let lastKey: Record<string, unknown> | undefined;

    do {
      const result = await this.docClient.send(
        new QueryCommand({
          TableName: this.tableName,
          KeyConditionExpression: "contextKey = :contextKey",
          ExpressionAttributeValues: { ":contextKey": contextKey },
          ExclusiveStartKey: lastKey,
        })
      );
      for (const item of result.Items ?? []) {
        contexts.push((item as ContextItem).data);
      }
      lastKey = result.LastEvaluatedKey;
    } while (lastKey);

    return contexts;
  }

  /**
   * Persist a context with an optimistic-lock guard.
   *
   * The guard compares the stored item's `version` against the version that was
   * read into `context` (round-tripped through the engine). A concurrent writer
   * that already bumped the version makes the conditional write fail and a
   * {@link OptimisticLockError} is thrown — the caller should re-read and retry.
   * `version` is incremented on every successful save (a brand-new item, with
   * no stored version, is accepted via `attribute_not_exists`).
   */
  async saveContext(
    domain: string,
    workflowId: string,
    subjectId: string,
    context: Context
  ): Promise<void> {
    // Version we read; `undefined`/0 means the instance was never persisted.
    const expectedVersion = context.version ?? 0;
    const nextVersion = expectedVersion + 1;

    const item: ContextItem = {
      contextKey: this.buildContextKey(domain, workflowId, subjectId),
      instanceId: context.instanceId,
      domain,
      subjectId,
      // Mirror the new version into the persisted context so the next read
      // hands the engine the current version to round-trip back here.
      data: { ...context, version: nextVersion },
      isCompleted: !!context.isCompleted,
      startedAt: context.startedAt,
      updatedAt: Date.now(),
      version: nextVersion,
    };

    try {
      await this.docClient.send(
        new PutCommand({
          TableName: this.tableName,
          Item: item,
          // `version` is a DynamoDB reserved word -> alias it.
          ConditionExpression:
            "attribute_not_exists(#version) OR #version = :expected",
          ExpressionAttributeNames: { "#version": "version" },
          ExpressionAttributeValues: { ":expected": expectedVersion },
        })
      );
    } catch (err) {
      if (err instanceof ConditionalCheckFailedException) {
        throw new OptimisticLockError(
          domain,
          workflowId,
          subjectId,
          context.instanceId
        );
      }
      throw err;
    }
  }

  async deleteContext(
    domain: string,
    workflowId: string,
    subjectId: string,
    instanceId: string
  ): Promise<void> {
    await this.docClient.send(
      new DeleteCommand({
        TableName: this.tableName,
        Key: {
          contextKey: this.buildContextKey(domain, workflowId, subjectId),
          instanceId,
        },
      })
    );
  }

  /**
   * Fetch a single Context by instance id.
   */
  async getContext(
    domain: string,
    workflowId: string,
    subjectId: string,
    instanceId: string
  ): Promise<Context | null> {
    const result = await this.docClient.send(
      new GetCommand({
        TableName: this.tableName,
        Key: {
          contextKey: this.buildContextKey(domain, workflowId, subjectId),
          instanceId,
        },
      })
    );
    if (!result.Item) {
      return null;
    }
    return (result.Item as ContextItem).data;
  }

  /**
   * List all contexts for a given subject across all workflows in a domain.
   * Uses the `domain-subjectId-index` GSI.
   */
  async getAllContextsForSubject(
    domain: string,
    subjectId: string
  ): Promise<Context[]> {
    const contexts: Context[] = [];
    let lastKey: Record<string, unknown> | undefined;

    do {
      const result = await this.docClient.send(
        new QueryCommand({
          TableName: this.tableName,
          IndexName: this.gsiName,
          KeyConditionExpression: "#domain = :domain AND subjectId = :subjectId",
          ExpressionAttributeNames: { "#domain": "domain" },
          ExpressionAttributeValues: { ":domain": domain, ":subjectId": subjectId },
          ExclusiveStartKey: lastKey,
        })
      );
      for (const item of result.Items ?? []) {
        contexts.push((item as ContextItem).data);
      }
      lastKey = result.LastEvaluatedKey;
    } while (lastKey);

    return contexts;
  }

  /**
   * List all contexts across all subjects and workflows in a domain.
   * Uses the `domain-subjectId-index` GSI.
   * Returns contexts annotated with `subjectId`.
   */
  async getAllContexts(
    domain: string
  ): Promise<Array<Context & { subjectId: string }>> {
    const contexts: Array<Context & { subjectId: string }> = [];
    let lastKey: Record<string, unknown> | undefined;

    do {
      const result = await this.docClient.send(
        new QueryCommand({
          TableName: this.tableName,
          IndexName: this.gsiName,
          KeyConditionExpression: "#domain = :domain",
          ExpressionAttributeNames: { "#domain": "domain" },
          ExpressionAttributeValues: { ":domain": domain },
          ExclusiveStartKey: lastKey,
        })
      );
      for (const item of result.Items ?? []) {
        const ci = item as ContextItem;
        contexts.push({ ...ci.data, subjectId: ci.subjectId });
      }
      lastKey = result.LastEvaluatedKey;
    } while (lastKey);

    return contexts;
  }
}
