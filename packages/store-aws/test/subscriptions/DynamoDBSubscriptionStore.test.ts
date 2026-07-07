import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DeleteCommand,
  DynamoDBDocumentClient,
  PutCommand,
  QueryCommand,
} from "@aws-sdk/lib-dynamodb";
import type { Subscription } from "@omega-flow/engine";
import { mockClient } from "aws-sdk-client-mock";
import { DynamoDBSubscriptionStore } from "../../src/subscriptions/DynamoDBSubscriptionStore";

const ddbMock = mockClient(DynamoDBDocumentClient);
const TABLE = "test-subscriptions";

const sampleSubscription: Subscription = {
  domain: "acme",
  eventType: "product.update",
  matchValue: "product:456",
  workflowId: "wf-1",
  subjectId: "client:5",
  instanceId: "inst-1",
  nodeId: "node-7",
  createdAt: 1000,
  ttl: 2000,
};

const sampleItem = {
  subscriptionKey: "acme#product.update#product:456",
  target: "wf-1#client:5#inst-1#node-7",
  domain: "acme",
  eventType: "product.update",
  matchValue: "product:456",
  workflowId: "wf-1",
  subjectId: "client:5",
  instanceId: "inst-1",
  nodeId: "node-7",
  createdAt: 1000,
  ttl: 2000,
};

describe("DynamoDBSubscriptionStore", () => {
  let store: DynamoDBSubscriptionStore;

  beforeEach(() => {
    ddbMock.reset();
    store = new DynamoDBSubscriptionStore({
      client: new DynamoDBClient({}),
      tableName: TABLE,
    });
  });

  describe("put", () => {
    it("writes the subscription with composite key and denormalised fields", async () => {
      ddbMock.on(PutCommand).resolves({});

      await store.put(sampleSubscription);

      const calls = ddbMock.commandCalls(PutCommand);
      expect(calls).toHaveLength(1);
      expect(calls[0].args[0].input).toMatchObject({
        TableName: TABLE,
        Item: sampleItem,
      });
    });
  });

  describe("match", () => {
    it("queries the exact key and the wildcard key", async () => {
      ddbMock.on(QueryCommand).resolves({ Items: [] });

      await store.match("acme", "product.update", "product:456");

      const calls = ddbMock.commandCalls(QueryCommand);
      expect(calls).toHaveLength(2);
      const queriedKeys = calls.map(
        (call) =>
          call.args[0].input.ExpressionAttributeValues?.[":subscriptionKey"]
      );
      expect(queriedKeys).toEqual([
        "acme#product.update#product:456",
        "acme#product.update#*",
      ]);
    });

    it("returns matching subscriptions", async () => {
      ddbMock
        .on(QueryCommand)
        .resolvesOnce({ Items: [sampleItem] })
        .resolvesOnce({ Items: [] });

      const result = await store.match("acme", "product.update", "product:456");

      expect(result).toEqual([sampleSubscription]);
    });

    it("filters expired subscriptions in the query", async () => {
      ddbMock.on(QueryCommand).resolves({ Items: [] });

      await store.match("acme", "product.update", "product:456");

      const calls = ddbMock.commandCalls(QueryCommand);
      expect(calls[0].args[0].input.FilterExpression).toBe(
        "attribute_not_exists(#ttl) OR #ttl > :now"
      );
      const now = calls[0].args[0].input.ExpressionAttributeValues?.[":now"];
      expect(typeof now).toBe("number");
    });

    it("does not query the same key twice for wildcard match values", async () => {
      ddbMock.on(QueryCommand).resolves({ Items: [] });

      await store.match("acme", "product.update", "*");

      expect(ddbMock.commandCalls(QueryCommand)).toHaveLength(1);
    });

    it("paginates through multiple pages", async () => {
      const item2 = { ...sampleItem, target: "wf-1#client:6#inst-2#node-7" };
      ddbMock
        .on(QueryCommand)
        .resolvesOnce({
          Items: [sampleItem],
          LastEvaluatedKey: {
            subscriptionKey: sampleItem.subscriptionKey,
            target: sampleItem.target,
          },
        })
        .resolvesOnce({ Items: [item2] })
        .resolvesOnce({ Items: [] });

      const result = await store.match("acme", "product.update", "product:456");

      expect(result).toHaveLength(2);
      expect(ddbMock.commandCalls(QueryCommand)).toHaveLength(3);
    });
  });

  describe("delete", () => {
    it("deletes each subscription by composite key", async () => {
      ddbMock.on(DeleteCommand).resolves({});

      await store.delete([sampleSubscription]);

      const calls = ddbMock.commandCalls(DeleteCommand);
      expect(calls).toHaveLength(1);
      expect(calls[0].args[0].input).toMatchObject({
        TableName: TABLE,
        Key: {
          subscriptionKey: "acme#product.update#product:456",
          target: "wf-1#client:5#inst-1#node-7",
        },
      });
    });

    it("does nothing for an empty list", async () => {
      await store.delete([]);
      expect(ddbMock.commandCalls(DeleteCommand)).toHaveLength(0);
    });
  });
});
