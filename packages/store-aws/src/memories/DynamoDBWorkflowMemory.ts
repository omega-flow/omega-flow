import { type DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DeleteCommand,
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  QueryCommand,
} from "@aws-sdk/lib-dynamodb";
import type { WorkflowMemory } from "@omega-flow/engine";
import type { Context } from "@omega-flow/types";

export interface DynamoDBWorkflowMemoryConfig {
  client: DynamoDBClient;
  tableName: string;
}

interface ContextItem {
  pk: string;
  sk: string;
  data: Context;
  isCompleted: boolean;
  startedAt: number;
  updatedAt: number;
}

/**
 * DynamoDB-backed implementation of WorkflowMemory.
 *
 * Table layout (dedicated contexts table):
 *   pk = `${domain}#${workflowId}#${subjectId}`
 *   sk = instanceId
 *   data = full Context JSON
 *   isCompleted, startedAt = mirrored from Context for filtering/sorting
 *   updatedAt = epoch ms, set on every save
 *
 * Assumes domain / workflowId / subjectId do not contain '#'.
 */
export class DynamoDBWorkflowMemory implements WorkflowMemory {
  private docClient: DynamoDBDocumentClient;
  private tableName: string;

  constructor(config: DynamoDBWorkflowMemoryConfig) {
    this.docClient = DynamoDBDocumentClient.from(config.client);
    this.tableName = config.tableName;
  }

  private buildPk(
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
    const pk = this.buildPk(domain, workflowId, subjectId);
    const contexts: Context[] = [];
    let lastKey: Record<string, unknown> | undefined;

    do {
      const result = await this.docClient.send(
        new QueryCommand({
          TableName: this.tableName,
          KeyConditionExpression: "pk = :pk",
          ExpressionAttributeValues: { ":pk": pk },
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

  async saveContext(
    domain: string,
    workflowId: string,
    subjectId: string,
    context: Context
  ): Promise<void> {
    const item: ContextItem = {
      pk: this.buildPk(domain, workflowId, subjectId),
      sk: context.instanceId,
      data: context,
      isCompleted: !!context.isCompleted,
      startedAt: context.startedAt,
      updatedAt: Date.now(),
    };

    await this.docClient.send(
      new PutCommand({
        TableName: this.tableName,
        Item: item,
      })
    );
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
          pk: this.buildPk(domain, workflowId, subjectId),
          sk: instanceId,
        },
      })
    );
  }

  /**
   * Test/admin helper: fetch a single Context by instance id.
   * Not part of the WorkflowMemory interface.
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
          pk: this.buildPk(domain, workflowId, subjectId),
          sk: instanceId,
        },
      })
    );
    if (!result.Item) {
      return null;
    }
    return (result.Item as ContextItem).data;
  }
}
