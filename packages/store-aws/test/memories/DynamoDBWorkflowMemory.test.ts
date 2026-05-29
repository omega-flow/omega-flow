import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DeleteCommand,
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  QueryCommand,
} from "@aws-sdk/lib-dynamodb";
import type { Context } from "@omega-flow/types";
import { mockClient } from "aws-sdk-client-mock";
import { DynamoDBWorkflowMemory } from "../../src/memories/DynamoDBWorkflowMemory";

const ddbMock = mockClient(DynamoDBDocumentClient);
const TABLE = "test-contexts";

const sampleContext: Context = {
  workflowId: "wf-1",
  instanceId: "inst-1",
  currentNodeId: "node-1",
  nodeState: { foo: "bar" },
  history: [{ time: 1000, type: "started" }],
  startedAt: 1000,
};

describe("DynamoDBWorkflowMemory", () => {
  let memory: DynamoDBWorkflowMemory;

  beforeEach(() => {
    ddbMock.reset();
    memory = new DynamoDBWorkflowMemory({
      client: new DynamoDBClient({}),
      tableName: TABLE,
    });
  });

  describe("getContexts", () => {
    it("queries with composite contextKey and returns contexts", async () => {
      ddbMock.on(QueryCommand).resolves({
        Items: [
          {
            contextKey: "acme#wf-1#user-1",
            instanceId: "inst-1",
            data: sampleContext,
            isCompleted: false,
            startedAt: 1000,
            updatedAt: 1000,
          },
        ],
      });

      const result = await memory.getContexts("acme", "wf-1", "user-1");

      expect(result).toEqual([sampleContext]);
      const calls = ddbMock.commandCalls(QueryCommand);
      expect(calls).toHaveLength(1);
      expect(calls[0].args[0].input).toMatchObject({
        TableName: TABLE,
        KeyConditionExpression: "contextKey = :contextKey",
        ExpressionAttributeValues: { ":contextKey": "acme#wf-1#user-1" },
      });
    });

    it("returns empty array when no items match", async () => {
      ddbMock.on(QueryCommand).resolves({});
      const result = await memory.getContexts("acme", "wf-1", "user-1");
      expect(result).toEqual([]);
    });

    it("paginates through multiple pages", async () => {
      const ctx2: Context = { ...sampleContext, instanceId: "inst-2" };
      ddbMock
        .on(QueryCommand)
        .resolvesOnce({
          Items: [
            {
              contextKey: "acme#wf-1#user-1",
              instanceId: "inst-1",
              data: sampleContext,
              isCompleted: false,
              startedAt: 1000,
              updatedAt: 1000,
            },
          ],
          LastEvaluatedKey: { contextKey: "acme#wf-1#user-1", instanceId: "inst-1" },
        })
        .resolvesOnce({
          Items: [
            {
              contextKey: "acme#wf-1#user-1",
              instanceId: "inst-2",
              data: ctx2,
              isCompleted: false,
              startedAt: 1000,
              updatedAt: 1000,
            },
          ],
        });

      const result = await memory.getContexts("acme", "wf-1", "user-1");

      expect(result.map((c) => c.instanceId)).toEqual(["inst-1", "inst-2"]);
      expect(ddbMock.commandCalls(QueryCommand)).toHaveLength(2);
    });
  });

  describe("saveContext", () => {
    it("writes the context with mirrored attributes", async () => {
      ddbMock.on(PutCommand).resolves({});

      await memory.saveContext("acme", "wf-1", "user-1", sampleContext);

      const calls = ddbMock.commandCalls(PutCommand);
      expect(calls).toHaveLength(1);
      const input = calls[0].args[0].input;
      expect(input.TableName).toBe(TABLE);
      expect(input.Item).toMatchObject({
        contextKey: "acme#wf-1#user-1",
        instanceId: "inst-1",
        domain: "acme",
        subjectId: "user-1",
        data: sampleContext,
        isCompleted: false,
        startedAt: 1000,
      });
      expect(typeof input.Item?.updatedAt).toBe("number");
    });

    it("mirrors isCompleted=true when context is completed", async () => {
      ddbMock.on(PutCommand).resolves({});
      const completed: Context = { ...sampleContext, isCompleted: true };

      await memory.saveContext("acme", "wf-1", "user-1", completed);

      const calls = ddbMock.commandCalls(PutCommand);
      expect(calls[0].args[0].input.Item).toMatchObject({
        isCompleted: true,
      });
    });

    it("treats undefined isCompleted as false", async () => {
      ddbMock.on(PutCommand).resolves({});

      await memory.saveContext("acme", "wf-1", "user-1", sampleContext);

      const calls = ddbMock.commandCalls(PutCommand);
      expect(calls[0].args[0].input.Item?.isCompleted).toBe(false);
    });
  });

  describe("deleteContext", () => {
    it("deletes by contextKey and instanceId", async () => {
      ddbMock.on(DeleteCommand).resolves({});

      await memory.deleteContext("acme", "wf-1", "user-1", "inst-1");

      const calls = ddbMock.commandCalls(DeleteCommand);
      expect(calls).toHaveLength(1);
      expect(calls[0].args[0].input).toMatchObject({
        TableName: TABLE,
        Key: { contextKey: "acme#wf-1#user-1", instanceId: "inst-1" },
      });
    });

    it("does not throw when item does not exist", async () => {
      ddbMock.on(DeleteCommand).resolves({});
      await expect(
        memory.deleteContext("acme", "wf-1", "user-1", "missing")
      ).resolves.toBeUndefined();
    });
  });

  describe("getContext", () => {
    it("returns the context when it exists", async () => {
      ddbMock.on(GetCommand).resolves({
        Item: {
          contextKey: "acme#wf-1#user-1",
          instanceId: "inst-1",
          data: sampleContext,
          isCompleted: false,
          startedAt: 1000,
          updatedAt: 1000,
        },
      });

      const result = await memory.getContext("acme", "wf-1", "user-1", "inst-1");

      expect(result).toEqual(sampleContext);
      const calls = ddbMock.commandCalls(GetCommand);
      expect(calls[0].args[0].input).toEqual({
        TableName: TABLE,
        Key: { contextKey: "acme#wf-1#user-1", instanceId: "inst-1" },
      });
    });

    it("returns null when the context does not exist", async () => {
      ddbMock.on(GetCommand).resolves({});
      const result = await memory.getContext(
        "acme",
        "wf-1",
        "user-1",
        "missing"
      );
      expect(result).toBeNull();
    });
  });

  describe("getAllContextsForSubject", () => {
    it("queries the GSI with domain and subjectId", async () => {
      ddbMock.on(QueryCommand).resolves({
        Items: [
          {
            contextKey: "acme#wf-1#user-1",
            instanceId: "inst-1",
            domain: "acme",
            subjectId: "user-1",
            data: sampleContext,
            isCompleted: false,
            startedAt: 1000,
            updatedAt: 1000,
          },
        ],
      });

      const result = await memory.getAllContextsForSubject("acme", "user-1");

      expect(result).toEqual([sampleContext]);
      const calls = ddbMock.commandCalls(QueryCommand);
      expect(calls).toHaveLength(1);
      expect(calls[0].args[0].input).toMatchObject({
        TableName: TABLE,
        IndexName: "domain-subjectId-index",
        KeyConditionExpression: "#domain = :domain AND subjectId = :subjectId",
        ExpressionAttributeNames: { "#domain": "domain" },
        ExpressionAttributeValues: { ":domain": "acme", ":subjectId": "user-1" },
      });
    });

    it("returns empty array when no items match", async () => {
      ddbMock.on(QueryCommand).resolves({});
      const result = await memory.getAllContextsForSubject("acme", "user-1");
      expect(result).toEqual([]);
    });
  });

  describe("getAllContexts", () => {
    it("queries the GSI with domain only and returns contexts with subjectId", async () => {
      ddbMock.on(QueryCommand).resolves({
        Items: [
          {
            contextKey: "acme#wf-1#user-1",
            instanceId: "inst-1",
            domain: "acme",
            subjectId: "user-1",
            data: sampleContext,
            isCompleted: false,
            startedAt: 1000,
            updatedAt: 1000,
          },
          {
            contextKey: "acme#wf-1#user-2",
            instanceId: "inst-2",
            domain: "acme",
            subjectId: "user-2",
            data: { ...sampleContext, instanceId: "inst-2" },
            isCompleted: false,
            startedAt: 2000,
            updatedAt: 2000,
          },
        ],
      });

      const result = await memory.getAllContexts("acme");

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({ ...sampleContext, subjectId: "user-1" });
      expect(result[1]).toMatchObject({ instanceId: "inst-2", subjectId: "user-2" });
      const calls = ddbMock.commandCalls(QueryCommand);
      expect(calls[0].args[0].input).toMatchObject({
        TableName: TABLE,
        IndexName: "domain-subjectId-index",
        KeyConditionExpression: "#domain = :domain",
        ExpressionAttributeNames: { "#domain": "domain" },
        ExpressionAttributeValues: { ":domain": "acme" },
      });
    });

    it("returns empty array when no items match", async () => {
      ddbMock.on(QueryCommand).resolves({});
      const result = await memory.getAllContexts("acme");
      expect(result).toEqual([]);
    });
  });
});
