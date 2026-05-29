import {
  ConditionalCheckFailedException,
  DynamoDBClient,
} from "@aws-sdk/client-dynamodb";
import {
  DeleteCommand,
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  QueryCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import type { Workflow } from "@omega-flow/types";
import { mockClient } from "aws-sdk-client-mock";
import { WorkflowAlreadyExistsError } from "../../src/errors";
import { DynamoDBWorkflowStore } from "../../src/stores/DynamoDBWorkflowStore";

const ddbMock = mockClient(DynamoDBDocumentClient);
const TABLE = "test-workflows";

const sampleWorkflow: Workflow = {
  id: "wf-1",
  name: "Sample",
  flow: { nodes: [], edges: [] },
  options: {},
};

describe("DynamoDBWorkflowStore", () => {
  let store: DynamoDBWorkflowStore;

  beforeEach(() => {
    ddbMock.reset();
    store = new DynamoDBWorkflowStore({
      client: new DynamoDBClient({}),
      tableName: TABLE,
    });
  });

  describe("getWorkflow", () => {
    it("returns the workflow when it exists", async () => {
      ddbMock.on(GetCommand).resolves({
        Item: {
          pk: "acme",
          sk: "wf-1",
          data: sampleWorkflow,
          createdAt: 1,
          updatedAt: 1,
        },
      });

      const result = await store.getWorkflow("acme", "wf-1");

      expect(result).toEqual(sampleWorkflow);
      const calls = ddbMock.commandCalls(GetCommand);
      expect(calls).toHaveLength(1);
      expect(calls[0].args[0].input).toEqual({
        TableName: TABLE,
        Key: { pk: "acme", sk: "wf-1" },
      });
    });

    it("returns null when the workflow does not exist", async () => {
      ddbMock.on(GetCommand).resolves({});
      const result = await store.getWorkflow("acme", "missing");
      expect(result).toBeNull();
    });
  });

  describe("getAllWorkflows", () => {
    it("returns workflows from a single page", async () => {
      ddbMock.on(QueryCommand).resolves({
        Items: [
          {
            pk: "acme",
            sk: "wf-1",
            data: sampleWorkflow,
            createdAt: 1,
            updatedAt: 1,
          },
        ],
      });

      const result = await store.getAllWorkflows("acme");

      expect(result).toEqual([sampleWorkflow]);
      const calls = ddbMock.commandCalls(QueryCommand);
      expect(calls[0].args[0].input).toMatchObject({
        TableName: TABLE,
        KeyConditionExpression: "pk = :pk",
        ExpressionAttributeValues: { ":pk": "acme" },
      });
    });

    it("returns empty array when no items match", async () => {
      ddbMock.on(QueryCommand).resolves({});
      const result = await store.getAllWorkflows("acme");
      expect(result).toEqual([]);
    });

    it("paginates through multiple pages", async () => {
      const wf2: Workflow = { ...sampleWorkflow, id: "wf-2", name: "Two" };
      ddbMock
        .on(QueryCommand)
        .resolvesOnce({
          Items: [
            {
              pk: "acme",
              sk: "wf-1",
              data: sampleWorkflow,
              createdAt: 1,
              updatedAt: 1,
            },
          ],
          LastEvaluatedKey: { pk: "acme", sk: "wf-1" },
        })
        .resolvesOnce({
          Items: [
            {
              pk: "acme",
              sk: "wf-2",
              data: wf2,
              createdAt: 1,
              updatedAt: 1,
            },
          ],
        });

      const result = await store.getAllWorkflows("acme");

      expect(result.map((w) => w.id)).toEqual(["wf-1", "wf-2"]);
      expect(ddbMock.commandCalls(QueryCommand)).toHaveLength(2);
    });
  });

  describe("setWorkflow", () => {
    it("upserts the workflow with the right key/data", async () => {
      ddbMock.on(UpdateCommand).resolves({});

      await store.setWorkflow("acme", sampleWorkflow);

      const calls = ddbMock.commandCalls(UpdateCommand);
      expect(calls).toHaveLength(1);
      const input = calls[0].args[0].input;
      expect(input.TableName).toBe(TABLE);
      expect(input.Key).toEqual({ pk: "acme", sk: "wf-1" });
      expect(input.UpdateExpression).toContain("SET #data = :data");
      expect(input.UpdateExpression).toContain(
        "createdAt = if_not_exists(createdAt, :now)"
      );
      expect(input.UpdateExpression).toContain("updatedAt = :now");
      expect(input.ExpressionAttributeNames).toEqual({ "#data": "data" });
      expect(input.ExpressionAttributeValues?.[":data"]).toEqual(
        sampleWorkflow
      );
    });
  });

  describe("createWorkflow", () => {
    it("generates an id and writes the workflow", async () => {
      ddbMock.on(PutCommand).resolves({});

      const result = await store.createWorkflow("acme", {
        name: "New",
        flow: { nodes: [], edges: [] },
        options: {},
      });

      expect(result.id).toEqual(expect.any(String));
      expect(result.id.length).toBe(8);
      expect(result.name).toBe("New");

      const calls = ddbMock.commandCalls(PutCommand);
      expect(calls).toHaveLength(1);
      const input = calls[0].args[0].input;
      expect(input.TableName).toBe(TABLE);
      expect(input.ConditionExpression).toBe("attribute_not_exists(pk)");
      expect(input.Item).toMatchObject({
        pk: "acme",
        sk: result.id,
        data: result,
      });
    });

    it("throws WorkflowAlreadyExistsError on conditional check failure", async () => {
      ddbMock.on(PutCommand).rejects(
        new ConditionalCheckFailedException({
          message: "Conditional check failed",
          $metadata: {},
        })
      );

      await expect(
        store.createWorkflow("acme", {
          name: "New",
          flow: { nodes: [], edges: [] },
          options: {},
        })
      ).rejects.toThrow(WorkflowAlreadyExistsError);
    });
  });

  describe("deleteWorkflow", () => {
    it("returns true when the item was deleted", async () => {
      ddbMock.on(DeleteCommand).resolves({
        Attributes: { pk: "acme", sk: "wf-1" },
      });

      const result = await store.deleteWorkflow("acme", "wf-1");

      expect(result).toBe(true);
      const calls = ddbMock.commandCalls(DeleteCommand);
      expect(calls[0].args[0].input).toMatchObject({
        TableName: TABLE,
        Key: { pk: "acme", sk: "wf-1" },
        ReturnValues: "ALL_OLD",
      });
    });

    it("returns false when the item did not exist", async () => {
      ddbMock.on(DeleteCommand).resolves({});
      const result = await store.deleteWorkflow("acme", "missing");
      expect(result).toBe(false);
    });
  });
});
