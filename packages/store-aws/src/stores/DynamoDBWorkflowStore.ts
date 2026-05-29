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
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import type { WorkflowStore } from "@omega-flow/engine";
import type { Workflow } from "@omega-flow/types";
import { nanoid } from "nanoid";
import { WorkflowAlreadyExistsError } from "../errors";

export interface DynamoDBWorkflowStoreConfig {
  client: DynamoDBClient;
  tableName: string;
}

interface WorkflowItem {
  domain: string;
  workflowId: string;
  data: Workflow;
  createdAt: number;
  updatedAt: number;
}

/**
 * DynamoDB-backed implementation of WorkflowStore.
 *
 * Table layout (dedicated workflows table):
 *   domain (pk) = tenant identifier (e.g. organization id, company id)
 *   workflowId (sk) = workflow id
 *   data = full Workflow JSON
 *   createdAt, updatedAt = epoch ms
 */
export class DynamoDBWorkflowStore implements WorkflowStore {
  private docClient: DynamoDBDocumentClient;
  private tableName: string;

  constructor(config: DynamoDBWorkflowStoreConfig) {
    this.docClient = DynamoDBDocumentClient.from(config.client);
    this.tableName = config.tableName;
  }

  async getWorkflow(
    domain: string,
    workflowId: string
  ): Promise<Workflow | null> {
    const result = await this.docClient.send(
      new GetCommand({
        TableName: this.tableName,
        Key: { domain, workflowId },
      })
    );
    if (!result.Item) {
      return null;
    }
    return (result.Item as WorkflowItem).data;
  }

  async getAllWorkflows(domain: string): Promise<Workflow[]> {
    const workflows: Workflow[] = [];
    let lastKey: Record<string, unknown> | undefined;

    do {
      const result = await this.docClient.send(
        new QueryCommand({
          TableName: this.tableName,
          KeyConditionExpression: "#domain = :domain",
          ExpressionAttributeNames: { "#domain": "domain" },
          ExpressionAttributeValues: { ":domain": domain },
          ExclusiveStartKey: lastKey,
        })
      );
      for (const item of result.Items ?? []) {
        workflows.push((item as WorkflowItem).data);
      }
      lastKey = result.LastEvaluatedKey;
    } while (lastKey);

    return workflows;
  }

  async setWorkflow(domain: string, workflow: Workflow): Promise<void> {
    const now = Date.now();
    await this.docClient.send(
      new UpdateCommand({
        TableName: this.tableName,
        Key: { domain, workflowId: workflow.id },
        UpdateExpression:
          "SET #data = :data, createdAt = if_not_exists(createdAt, :now), updatedAt = :now",
        ExpressionAttributeNames: { "#data": "data" },
        ExpressionAttributeValues: { ":data": workflow, ":now": now },
      })
    );
  }

  async createWorkflow(
    domain: string,
    workflowData: Omit<Workflow, "id">
  ): Promise<Workflow> {
    const id = nanoid(8);
    const workflow: Workflow = { ...workflowData, id };
    const now = Date.now();
    const item: WorkflowItem = {
      domain,
      workflowId: id,
      data: workflow,
      createdAt: now,
      updatedAt: now,
    };

    try {
      await this.docClient.send(
        new PutCommand({
          TableName: this.tableName,
          Item: item,
          ConditionExpression: "attribute_not_exists(#domain)",
          ExpressionAttributeNames: { "#domain": "domain" },
        })
      );
    } catch (err) {
      if (err instanceof ConditionalCheckFailedException) {
        throw new WorkflowAlreadyExistsError(domain, id);
      }
      throw err;
    }

    return workflow;
  }

  async deleteWorkflow(
    domain: string,
    workflowId: string
  ): Promise<boolean> {
    const result = await this.docClient.send(
      new DeleteCommand({
        TableName: this.tableName,
        Key: { domain, workflowId },
        ReturnValues: "ALL_OLD",
      })
    );
    return result.Attributes !== undefined;
  }
}
