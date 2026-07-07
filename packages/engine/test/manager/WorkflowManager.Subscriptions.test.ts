// @ts-nocheck
import type { Event, Workflow } from "@omega-flow/types";
import {
  WorkflowManager,
  InMemoryWorkflowStore,
  InMemoryWorkflowMemory,
  InMemoryWorkflowScheduler,
  InMemorySubscriptionStore,
} from "../../src/manager";
import nodeTypes from "../../src/nodes";
import { WorkflowBuilder } from "../helpers";

const DURATION_MS = 60_000;

/**
 * Cross-subject workflow: starts on order.create (customer space) and then
 * waits for product.update matched to the ordered product (product space).
 *
 *   Trigger(order.create)
 *     -> TriggerOrTimeout(product.update, match product:<ordered product>)
 *          -- trigger --> Action -> Exit
 *          -- timeout --> Exit
 */
function buildCrossSubjectWorkflow(matchValue?: string | null): Workflow {
  const params: Record<string, unknown> = {
    event: "product.update",
    duration: DURATION_MS,
  };
  if (matchValue !== null) {
    params.match = matchValue === undefined ? {} : { value: matchValue };
  }

  return WorkflowBuilder.create("back-in-stock", "Back in stock")
    .addNode("start", "Trigger", { params: { event: "order.create" } })
    .addNode("wait-product", "TriggerOrTimeout", { params })
    .addNode("notify", "Action", { params: { action: "send_email" } })
    .addNode("end", "Exit", {})
    .addEdge("start", "wait-product")
    .addEdge("wait-product", "notify", { sourceHandle: "trigger" })
    .addEdge("wait-product", "end", { sourceHandle: "timeout" })
    .addEdge("notify", "end")
    .build();
}

describe("WorkflowManager - Event subscriptions", () => {
  const testDomain = "shop-1";
  let store: InMemoryWorkflowStore;
  let memory: InMemoryWorkflowMemory;
  let scheduler: InMemoryWorkflowScheduler;
  let subscriptionStore: InMemorySubscriptionStore;

  const orderCreateEvent: Event = {
    id: "evt-order-1",
    type: "order.create",
    time: Date.now(),
    data: {
      subjectId: "client:5",
      payload: { products: [{ product_id: 456 }] },
    },
  };

  const productUpdateEvent: Event = {
    id: "evt-product-1",
    type: "product.update",
    time: Date.now(),
    data: {
      subjectId: "product:456",
      payload: { product_id: 456, stock: 3 },
    },
  };

  function createManager(workflow: Workflow, withSubscriptions = true) {
    store = new InMemoryWorkflowStore([{ domain: testDomain, workflow }]);
    memory = new InMemoryWorkflowMemory();
    scheduler = new InMemoryWorkflowScheduler();
    subscriptionStore = new InMemorySubscriptionStore();

    const manager = new WorkflowManager({
      workflowStore: store,
      workflowMemory: memory,
      workflowScheduler: scheduler,
      nodeModels: nodeTypes,
      subscriptionStore: withSubscriptions ? subscriptionStore : undefined,
      eventExtractor: (event) => [testDomain, event.data?.subjectId],
    });
    scheduler.setWorkflowManager(manager);
    return manager;
  }

  afterEach(async () => {
    await scheduler.cancelAll();
  });

  describe("registration on park", () => {
    it("registers a subscription when the instance parks on a match node", async () => {
      const manager = createManager(
        buildCrossSubjectWorkflow(
          "product:{{trigger.payload.products[0].product_id}}"
        )
      );

      await manager.processEvent(orderCreateEvent);

      const subs = subscriptionStore.getAll();
      expect(subs).toHaveLength(1);
      expect(subs[0]).toMatchObject({
        domain: testDomain,
        eventType: "product.update",
        matchValue: "product:456",
        workflowId: "back-in-stock",
        subjectId: "client:5",
        nodeId: "wait-product",
      });

      // TTL safety net: node duration plus margin
      const expectedTtl =
        Math.floor(Date.now() / 1000) + DURATION_MS / 1000 + 24 * 60 * 60;
      expect(subs[0].ttl).toBeGreaterThanOrEqual(expectedTtl - 5);
      expect(subs[0].ttl).toBeLessThanOrEqual(expectedTtl + 5);

      // The context records the active subscription (single source of truth)
      const contexts = await memory.getContexts(
        testDomain,
        "back-in-stock",
        "client:5"
      );
      expect(contexts).toHaveLength(1);
      expect(contexts[0].subscriptions).toEqual([
        {
          eventType: "product.update",
          matchValue: "product:456",
          nodeId: "wait-product",
        },
      ]);
      expect(contexts[0].triggerEvent).toMatchObject({ id: "evt-order-1" });
      expect(subs[0].instanceId).toBe(contexts[0].instanceId);
    });

    it("registers a wildcard subscription when match.value is omitted", async () => {
      const manager = createManager(buildCrossSubjectWorkflow(undefined));

      await manager.processEvent(orderCreateEvent);

      const subs = subscriptionStore.getAll();
      expect(subs).toHaveLength(1);
      expect(subs[0].matchValue).toBe("*");
    });

    it("registers nothing when the node has no match section", async () => {
      const manager = createManager(buildCrossSubjectWorkflow(null));

      await manager.processEvent(orderCreateEvent);

      expect(subscriptionStore.getAll()).toHaveLength(0);
      const contexts = await memory.getContexts(
        testDomain,
        "back-in-stock",
        "client:5"
      );
      expect(contexts[0].subscriptions).toBeUndefined();
    });

    it("registers nothing when the match value cannot be resolved", async () => {
      const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
      const manager = createManager(
        buildCrossSubjectWorkflow("product:{{trigger.payload.missing.field}}")
      );

      await manager.processEvent(orderCreateEvent);

      expect(subscriptionStore.getAll()).toHaveLength(0);
      // Instance is still parked (it can resume via its own subject / timeout)
      const contexts = await memory.getContexts(
        testDomain,
        "back-in-stock",
        "client:5"
      );
      expect(contexts[0].currentNodeId).toBe("wait-product");
      expect(warn).toHaveBeenCalled();
      warn.mockRestore();
    });

    it("does not re-register on unrelated events while parked", async () => {
      const manager = createManager(
        buildCrossSubjectWorkflow(
          "product:{{trigger.payload.products[0].product_id}}"
        )
      );
      await manager.processEvent(orderCreateEvent);

      const putSpy = jest.spyOn(subscriptionStore, "put");
      await manager.processEvent({
        id: "evt-noop",
        type: "client.edit",
        time: Date.now(),
        data: { subjectId: "client:5" },
      });

      expect(putSpy).not.toHaveBeenCalled();
      expect(subscriptionStore.getAll()).toHaveLength(1);
      putSpy.mockRestore();
    });
  });

  describe("matching", () => {
    it("matches subscriptions by the event's own subject id", async () => {
      const manager = createManager(
        buildCrossSubjectWorkflow(
          "product:{{trigger.payload.products[0].product_id}}"
        )
      );
      await manager.processEvent(orderCreateEvent);

      const matches = await manager.matchSubscriptions(productUpdateEvent);
      expect(matches).toHaveLength(1);
      expect(matches[0].subjectId).toBe("client:5");

      const other = await manager.matchSubscriptions({
        ...productUpdateEvent,
        id: "evt-product-2",
        data: { subjectId: "product:999", payload: { product_id: 999 } },
      });
      expect(other).toHaveLength(0);
    });

    it("matches wildcard subscriptions for any subject of the event type", async () => {
      const manager = createManager(buildCrossSubjectWorkflow(undefined));
      await manager.processEvent(orderCreateEvent);

      const matches = await manager.matchSubscriptions({
        ...productUpdateEvent,
        data: { subjectId: "product:999", payload: { product_id: 999 } },
      });
      expect(matches).toHaveLength(1);
    });

    it("does not match delivery events (no fan-out of copies)", async () => {
      const manager = createManager(buildCrossSubjectWorkflow(undefined));
      await manager.processEvent(orderCreateEvent);

      const [match] = await manager.matchSubscriptions(productUpdateEvent);
      const deliveryEvent = manager.createDeliveryEvent(
        productUpdateEvent,
        match
      );

      expect(await manager.matchSubscriptions(deliveryEvent)).toHaveLength(0);
    });

    it("returns no matches when no subscriptionStore is configured", async () => {
      const manager = createManager(
        buildCrossSubjectWorkflow(
          "product:{{trigger.payload.products[0].product_id}}"
        ),
        false
      );
      await manager.processEvent(orderCreateEvent);

      expect(await manager.matchSubscriptions(productUpdateEvent)).toEqual([]);
    });
  });

  describe("createDeliveryEvent", () => {
    it("retargets the event at the subscriber and adds delivery metadata", async () => {
      const manager = createManager(
        buildCrossSubjectWorkflow(
          "product:{{trigger.payload.products[0].product_id}}"
        )
      );
      await manager.processEvent(orderCreateEvent);
      const [match] = await manager.matchSubscriptions(productUpdateEvent);

      const deliveryEvent = manager.createDeliveryEvent(
        productUpdateEvent,
        match
      );

      expect(deliveryEvent.type).toBe("product.update");
      expect(deliveryEvent.data.subjectId).toBe("client:5");
      expect(deliveryEvent.data.payload).toEqual(
        productUpdateEvent.data.payload
      );
      expect(deliveryEvent.data.delivery).toEqual({
        workflowId: "back-in-stock",
        instanceId: match.instanceId,
        nodeId: "wait-product",
        sourceSubjectId: "product:456",
      });
      // Original event is not mutated
      expect(productUpdateEvent.data.delivery).toBeUndefined();
      expect(productUpdateEvent.data.subjectId).toBe("product:456");
    });
  });

  describe("delivery (targeted resume)", () => {
    async function parkAndMatch(manager: WorkflowManager) {
      await manager.processEvent(orderCreateEvent);
      const [match] = await manager.matchSubscriptions(productUpdateEvent);
      return match;
    }

    it("resumes exactly the subscribed instance and cleans up", async () => {
      const manager = createManager(
        buildCrossSubjectWorkflow(
          "product:{{trigger.payload.products[0].product_id}}"
        )
      );
      const match = await parkAndMatch(manager);
      const deliveryEvent = manager.createDeliveryEvent(
        productUpdateEvent,
        match
      );

      const resumed = await manager.deliverEvent(
        testDomain,
        match.workflowId,
        match.subjectId,
        match.instanceId,
        deliveryEvent
      );

      expect(resumed).toBe(true);
      const contexts = await memory.getContexts(
        testDomain,
        "back-in-stock",
        "client:5"
      );
      expect(contexts[0].isCompleted).toBe(true);
      expect(contexts[0].nodeState["wait-product"].resolvedBy).toBe("trigger");
      // Subscription removed from store and context
      expect(subscriptionStore.getAll()).toHaveLength(0);
      expect(contexts[0].subscriptions).toBeUndefined();
    });

    it("drops redelivery after the instance completed (idempotent)", async () => {
      const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
      const manager = createManager(
        buildCrossSubjectWorkflow(
          "product:{{trigger.payload.products[0].product_id}}"
        )
      );
      const match = await parkAndMatch(manager);
      const deliveryEvent = manager.createDeliveryEvent(
        productUpdateEvent,
        match
      );

      await manager.deliverEvent(
        testDomain,
        match.workflowId,
        match.subjectId,
        match.instanceId,
        deliveryEvent
      );
      const second = await manager.deliverEvent(
        testDomain,
        match.workflowId,
        match.subjectId,
        match.instanceId,
        deliveryEvent
      );

      expect(second).toBe(false);
      warn.mockRestore();
    });

    it("drops delivery when the instance is gone", async () => {
      const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
      const manager = createManager(
        buildCrossSubjectWorkflow(
          "product:{{trigger.payload.products[0].product_id}}"
        )
      );
      const match = await parkAndMatch(manager);
      const deliveryEvent = manager.createDeliveryEvent(
        productUpdateEvent,
        match
      );

      const resumed = await manager.deliverEvent(
        testDomain,
        match.workflowId,
        match.subjectId,
        "no-such-instance",
        deliveryEvent
      );

      expect(resumed).toBe(false);
      warn.mockRestore();
    });

    it("drops delivery when the instance is no longer parked on the node", async () => {
      const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
      const manager = createManager(
        buildCrossSubjectWorkflow(
          "product:{{trigger.payload.products[0].product_id}}"
        )
      );
      const match = await parkAndMatch(manager);
      const deliveryEvent = manager.createDeliveryEvent(
        productUpdateEvent,
        match
      );
      deliveryEvent.data.delivery.nodeId = "some-other-node";

      const resumed = await manager.deliverEvent(
        testDomain,
        match.workflowId,
        match.subjectId,
        match.instanceId,
        deliveryEvent
      );

      expect(resumed).toBe(false);
      // Instance untouched, subscription still registered
      const contexts = await memory.getContexts(
        testDomain,
        "back-in-stock",
        "client:5"
      );
      expect(contexts[0].currentNodeId).toBe("wait-product");
      expect(subscriptionStore.getAll()).toHaveLength(1);
      warn.mockRestore();
    });
  });

  describe("cleanup", () => {
    it("deletes the subscription when the timeout fires first", async () => {
      const manager = createManager(
        buildCrossSubjectWorkflow(
          "product:{{trigger.payload.products[0].product_id}}"
        )
      );
      await manager.processEvent(orderCreateEvent);
      expect(subscriptionStore.getAll()).toHaveLength(1);

      // Any event on the instance's own subject after the timeout resolves the wait
      await manager.processEvent({
        id: "evt-late",
        type: "system:timeout",
        time: Date.now() + DURATION_MS + 1000,
        data: { subjectId: "client:5" },
      });

      const contexts = await memory.getContexts(
        testDomain,
        "back-in-stock",
        "client:5"
      );
      expect(contexts[0].isCompleted).toBe(true);
      expect(contexts[0].nodeState["wait-product"].resolvedBy).toBe("timeout");
      expect(subscriptionStore.getAll()).toHaveLength(0);
      expect(contexts[0].subscriptions).toBeUndefined();
    });

    it("registers the subscription even when saving the context fails (orphan over deaf)", async () => {
      const error = jest.spyOn(console, "error").mockImplementation(() => {});
      const manager = createManager(
        buildCrossSubjectWorkflow(
          "product:{{trigger.payload.products[0].product_id}}"
        )
      );
      jest
        .spyOn(memory, "saveContext")
        .mockRejectedValueOnce(new Error("simulated crash"));

      await manager.processEvent(orderCreateEvent);

      // Context save failed, but the subscription was written first:
      // worst case is an orphan (dropped on delivery, TTL-cleaned),
      // never a parked instance nobody can resume.
      expect(subscriptionStore.getAll()).toHaveLength(1);
      error.mockRestore();
    });
  });
});
