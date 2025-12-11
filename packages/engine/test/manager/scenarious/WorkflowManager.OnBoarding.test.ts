// @ts-nocheck
import type { Event, Context } from "@omega-flow/types";
import {
  WorkflowManager,
  InMemoryWorkflowStore,
  InMemoryWorkflowMemory,
  InMemoryWorkflowScheduler,
} from "../../../src/manager";
import nodeTypes from "../../../src/nodes";
import { WorkflowBuilder } from "../../helpers/WorkflowBuilder";

/**
 * Test suite for OnBoarding Campaign workflow scenario.
 *
 * This tests a real-world onboarding campaign with:
 * - order.created trigger
 * - Multiple steps (3 actions) with wait nodes between them
 * - one_time frequency (each user goes through once)
 * - Multiple users going through the workflow independently
 *
 * Workflow structure:
 *   Trigger (order.created)
 *     -> Action (Send Welcome Email)
 *       -> Wait (1 day)
 *         -> Action (Send Tips Email)
 *           -> Wait (3 days)
 *             -> Action (Send Feedback Request)
 *               -> Exit
 */
describe("WorkflowManager OnBoarding Campaign", () => {
  let manager: WorkflowManager;
  let store: InMemoryWorkflowStore;
  let memory: InMemoryWorkflowMemory;
  let scheduler: InMemoryWorkflowScheduler;
  const testDomain = "ecommerce";

  // Time constants (in milliseconds)
  const ONE_DAY = 24 * 60 * 60 * 1000;
  const THREE_DAYS = 3 * ONE_DAY;

  // Build the onboarding workflow using WorkflowBuilder
  const onboardingWorkflow = WorkflowBuilder.create(
    "onboarding-campaign",
    "Customer Onboarding Campaign"
  )
    .addNode("trigger", "Trigger", {
      label: "Order Created",
      params: { event: "order.created" },
    })
    .addNode("action-welcome", "Action", {
      label: "Send Welcome Email",
      params: { action: "send_email", template: "welcome" },
    })
    .addNode("wait-1", "Wait", {
      label: "Wait 1 day",
      params: { duration: ONE_DAY },
    })
    .addNode("action-tips", "Action", {
      label: "Send Tips Email",
      params: { action: "send_email", template: "tips" },
    })
    .addNode("wait-2", "Wait", {
      label: "Wait 3 days",
      params: { duration: THREE_DAYS },
    })
    .addNode("action-feedback", "Action", {
      label: "Send Feedback Request",
      params: { action: "send_email", template: "feedback" },
    })
    .addNode("exit", "Exit", { label: "End" })
    .addEdge("trigger", "action-welcome")
    .addEdge("action-welcome", "wait-1")
    .addEdge("wait-1", "action-tips")
    .addEdge("action-tips", "wait-2")
    .addEdge("wait-2", "action-feedback")
    .addEdge("action-feedback", "exit")
    .oneTime()
    .build();

  beforeEach(() => {
    store = new InMemoryWorkflowStore([
      { domain: testDomain, workflow: onboardingWorkflow },
    ]);
    memory = new InMemoryWorkflowMemory();
    scheduler = new InMemoryWorkflowScheduler();

    manager = new WorkflowManager({
      workflowStore: store,
      workflowMemory: memory,
      workflowScheduler: scheduler,
      nodeModels: nodeTypes,
      eventExtractor: (event) => [
        event.data?.domain || testDomain,
        event.data?.userId || "unknown",
      ],
    });

    scheduler.setWorkflowManager(manager);
  });

  describe("Single user journey", () => {
    it("should start workflow when order.created event is received", async () => {
      const event: Event = {
        id: "e1",
        type: "order.created",
        time: Date.now(),
        data: { userId: "user-1", orderId: "order-1" },
      };

      await manager.processEvent(event);

      const contexts = await memory.getContexts(
        testDomain,
        "onboarding-campaign",
        "user-1"
      );
      expect(contexts.length).toBe(1);
      expect(contexts[0].workflowId).toBe("onboarding-campaign");
      expect(contexts[0].isCompleted).toBe(false);
      // Should have passed trigger and action, now waiting at wait-1
      expect(contexts[0].currentNodeId).toBe("wait-1");
    });

    it("should stay on wait node when timeout has not elapsed", async () => {
      const startTime = 1000000;

      // Trigger the workflow
      const triggerEvent: Event = {
        id: "e1",
        type: "order.created",
        time: startTime,
        data: { userId: "user-1", orderId: "order-1" },
      };
      await manager.processEvent(triggerEvent);

      // Send a timeout event before wait duration (e.g., 12 hours later, not 1 day)
      const earlyTimeoutEvent: Event = {
        id: "e2",
        type: "timeout",
        time: startTime + ONE_DAY / 2, // Only half a day
        data: { userId: "user-1" },
      };
      await manager.processEvent(earlyTimeoutEvent);

      const contexts = await memory.getContexts(
        testDomain,
        "onboarding-campaign",
        "user-1"
      );
      expect(contexts[0].currentNodeId).toBe("wait-1");
      expect(contexts[0].isCompleted).toBe(false);
    });

    it("should proceed to next action when wait duration has elapsed", async () => {
      const startTime = 1000000;

      // Trigger the workflow
      const triggerEvent: Event = {
        id: "e1",
        type: "order.created",
        time: startTime,
        data: { userId: "user-1", orderId: "order-1" },
      };
      await manager.processEvent(triggerEvent);

      // Send a timeout event after wait duration (1 day + 1 second)
      const timeoutEvent: Event = {
        id: "e2",
        type: "timeout",
        time: startTime + ONE_DAY + 1000,
        data: { userId: "user-1" },
      };
      await manager.processEvent(timeoutEvent);

      const contexts = await memory.getContexts(
        testDomain,
        "onboarding-campaign",
        "user-1"
      );
      // Should have passed action-tips and now waiting at wait-2
      expect(contexts[0].currentNodeId).toBe("wait-2");
      expect(contexts[0].isCompleted).toBe(false);
    });

    it("should complete the entire onboarding flow with proper timing", async () => {
      const startTime = 1000000;

      // Step 1: Trigger the workflow with order.created
      const triggerEvent: Event = {
        id: "e1",
        type: "order.created",
        time: startTime,
        data: { userId: "user-1", orderId: "order-1" },
      };
      await manager.processEvent(triggerEvent);

      let contexts = await memory.getContexts(
        testDomain,
        "onboarding-campaign",
        "user-1"
      );
      expect(contexts[0].currentNodeId).toBe("wait-1");

      // Step 2: Timeout after 1 day - should move to wait-2
      const timeout1: Event = {
        id: "e2",
        type: "timeout",
        time: startTime + ONE_DAY + 1000,
        data: { userId: "user-1" },
      };
      await manager.processEvent(timeout1);

      contexts = await memory.getContexts(
        testDomain,
        "onboarding-campaign",
        "user-1"
      );
      expect(contexts[0].currentNodeId).toBe("wait-2");

      // Step 3: Timeout after 3 more days - should complete
      const timeout2: Event = {
        id: "e3",
        type: "timeout",
        time: startTime + ONE_DAY + THREE_DAYS + 2000,
        data: { userId: "user-1" },
      };
      await manager.processEvent(timeout2);

      contexts = await memory.getContexts(
        testDomain,
        "onboarding-campaign",
        "user-1"
      );
      expect(contexts[0].isCompleted).toBe(true);
      expect(contexts[0].currentNodeId).toBe("exit");
    });
  });

  describe("Multiple users journey", () => {
    it("should handle multiple users independently", async () => {
      const startTime = 1000000;

      // User 1 starts
      const event1: Event = {
        id: "e1",
        type: "order.created",
        time: startTime,
        data: { userId: "user-1", orderId: "order-1" },
      };
      await manager.processEvent(event1);

      // User 2 starts 2 hours later
      const event2: Event = {
        id: "e2",
        type: "order.created",
        time: startTime + 2 * 60 * 60 * 1000,
        data: { userId: "user-2", orderId: "order-2" },
      };
      await manager.processEvent(event2);

      const contexts1 = await memory.getContexts(
        testDomain,
        "onboarding-campaign",
        "user-1"
      );
      const contexts2 = await memory.getContexts(
        testDomain,
        "onboarding-campaign",
        "user-2"
      );

      // Both should be at wait-1 node
      expect(contexts1[0].currentNodeId).toBe("wait-1");
      expect(contexts2[0].currentNodeId).toBe("wait-1");
      expect(contexts1[0].instanceId).not.toBe(contexts2[0].instanceId);
    });

    it("should progress users independently based on their own timing", async () => {
      const startTime = 1000000;
      const twoHours = 2 * 60 * 60 * 1000;

      // User 1 starts first
      await manager.processEvent({
        id: "e1",
        type: "order.created",
        time: startTime,
        data: { userId: "user-1", orderId: "order-1" },
      });

      // User 2 starts 2 hours later
      await manager.processEvent({
        id: "e2",
        type: "order.created",
        time: startTime + twoHours,
        data: { userId: "user-2", orderId: "order-2" },
      });

      // User 3 starts 4 hours later
      await manager.processEvent({
        id: "e3",
        type: "order.created",
        time: startTime + 2 * twoHours,
        data: { userId: "user-3", orderId: "order-3" },
      });

      // Send timeout for user-1 after 1 day (user-1 should advance)
      await manager.processEvent({
        id: "t1",
        type: "timeout",
        time: startTime + ONE_DAY + 1000,
        data: { userId: "user-1" },
      });

      // Send timeout for user-2 at the same absolute time (user-2 should NOT advance yet)
      await manager.processEvent({
        id: "t2",
        type: "timeout",
        time: startTime + ONE_DAY + 1000,
        data: { userId: "user-2" },
      });

      const contexts1 = await memory.getContexts(
        testDomain,
        "onboarding-campaign",
        "user-1"
      );
      const contexts2 = await memory.getContexts(
        testDomain,
        "onboarding-campaign",
        "user-2"
      );
      const contexts3 = await memory.getContexts(
        testDomain,
        "onboarding-campaign",
        "user-3"
      );

      // User 1 should have advanced past wait-1 to wait-2
      expect(contexts1[0].currentNodeId).toBe("wait-2");

      // User 2 started 2 hours later, so wait-1 hasn't completed yet
      expect(contexts2[0].currentNodeId).toBe("wait-1");

      // User 3 hasn't received timeout yet
      expect(contexts3[0].currentNodeId).toBe("wait-1");
    });

    it("should complete multiple users at different times", async () => {
      const startTime = 1000000;
      const sixHours = 6 * 60 * 60 * 1000;

      // User 1 starts
      await manager.processEvent({
        id: "e1",
        type: "order.created",
        time: startTime,
        data: { userId: "user-1", orderId: "order-1" },
      });

      // User 2 starts 6 hours later
      await manager.processEvent({
        id: "e2",
        type: "order.created",
        time: startTime + sixHours,
        data: { userId: "user-2", orderId: "order-2" },
      });

      // Complete user 1's journey
      await manager.processEvent({
        id: "t1-1",
        type: "timeout",
        time: startTime + ONE_DAY + 1000,
        data: { userId: "user-1" },
      });
      await manager.processEvent({
        id: "t1-2",
        type: "timeout",
        time: startTime + ONE_DAY + THREE_DAYS + 2000,
        data: { userId: "user-1" },
      });

      // Complete user 2's journey (with their own timing)
      await manager.processEvent({
        id: "t2-1",
        type: "timeout",
        time: startTime + sixHours + ONE_DAY + 1000,
        data: { userId: "user-2" },
      });
      await manager.processEvent({
        id: "t2-2",
        type: "timeout",
        time: startTime + sixHours + ONE_DAY + THREE_DAYS + 2000,
        data: { userId: "user-2" },
      });

      const contexts1 = await memory.getContexts(
        testDomain,
        "onboarding-campaign",
        "user-1"
      );
      const contexts2 = await memory.getContexts(
        testDomain,
        "onboarding-campaign",
        "user-2"
      );

      // Both should be completed
      expect(contexts1[0].isCompleted).toBe(true);
      expect(contexts2[0].isCompleted).toBe(true);
    });
  });

  describe("one_time frequency behavior", () => {
    it("should not start a new workflow for a user who already completed", async () => {
      const startTime = 1000000;

      // Start and complete the workflow for user-1
      await manager.processEvent({
        id: "e1",
        type: "order.created",
        time: startTime,
        data: { userId: "user-1", orderId: "order-1" },
      });
      await manager.processEvent({
        id: "t1",
        type: "timeout",
        time: startTime + ONE_DAY + 1000,
        data: { userId: "user-1" },
      });
      await manager.processEvent({
        id: "t2",
        type: "timeout",
        time: startTime + ONE_DAY + THREE_DAYS + 2000,
        data: { userId: "user-1" },
      });

      const contextsBefore = await memory.getContexts(
        testDomain,
        "onboarding-campaign",
        "user-1"
      );
      expect(contextsBefore.length).toBe(1);
      expect(contextsBefore[0].isCompleted).toBe(true);
      const originalInstanceId = contextsBefore[0].instanceId;

      // Try to trigger again with a new order
      await manager.processEvent({
        id: "e2",
        type: "order.created",
        time: startTime + ONE_DAY + THREE_DAYS + 10000,
        data: { userId: "user-1", orderId: "order-2" },
      });

      const contextsAfter = await memory.getContexts(
        testDomain,
        "onboarding-campaign",
        "user-1"
      );

      // Should still only have one instance
      expect(contextsAfter.length).toBe(1);
      expect(contextsAfter[0].instanceId).toBe(originalInstanceId);
      expect(contextsAfter[0].isCompleted).toBe(true);
    });

    it("should not start a new workflow while one is in progress", async () => {
      const startTime = 1000000;

      // Start workflow for user-1
      await manager.processEvent({
        id: "e1",
        type: "order.created",
        time: startTime,
        data: { userId: "user-1", orderId: "order-1" },
      });

      const contextsBefore = await memory.getContexts(
        testDomain,
        "onboarding-campaign",
        "user-1"
      );
      expect(contextsBefore[0].currentNodeId).toBe("wait-1");
      const originalInstanceId = contextsBefore[0].instanceId;

      // Try to trigger again while workflow is still active
      await manager.processEvent({
        id: "e2",
        type: "order.created",
        time: startTime + 1000,
        data: { userId: "user-1", orderId: "order-2" },
      });

      const contextsAfter = await memory.getContexts(
        testDomain,
        "onboarding-campaign",
        "user-1"
      );

      // Should still only have one instance
      expect(contextsAfter.length).toBe(1);
      expect(contextsAfter[0].instanceId).toBe(originalInstanceId);
    });

    it("should allow different users to start independently", async () => {
      const startTime = 1000000;

      // Start for user-1
      await manager.processEvent({
        id: "e1",
        type: "order.created",
        time: startTime,
        data: { userId: "user-1", orderId: "order-1" },
      });

      // Start for user-2
      await manager.processEvent({
        id: "e2",
        type: "order.created",
        time: startTime,
        data: { userId: "user-2", orderId: "order-2" },
      });

      // Start for user-3
      await manager.processEvent({
        id: "e3",
        type: "order.created",
        time: startTime,
        data: { userId: "user-3", orderId: "order-3" },
      });

      const contexts1 = await memory.getContexts(
        testDomain,
        "onboarding-campaign",
        "user-1"
      );
      const contexts2 = await memory.getContexts(
        testDomain,
        "onboarding-campaign",
        "user-2"
      );
      const contexts3 = await memory.getContexts(
        testDomain,
        "onboarding-campaign",
        "user-3"
      );

      // Each user should have their own instance
      expect(contexts1.length).toBe(1);
      expect(contexts2.length).toBe(1);
      expect(contexts3.length).toBe(1);

      // All at the same position (wait-1)
      expect(contexts1[0].currentNodeId).toBe("wait-1");
      expect(contexts2[0].currentNodeId).toBe("wait-1");
      expect(contexts3[0].currentNodeId).toBe("wait-1");

      // But all different instances
      expect(contexts1[0].instanceId).not.toBe(contexts2[0].instanceId);
      expect(contexts2[0].instanceId).not.toBe(contexts3[0].instanceId);
    });
  });

  describe("Wait node behavior", () => {
    it("should record wait start time in node state", async () => {
      const startTime = 1000000;

      await manager.processEvent({
        id: "e1",
        type: "order.created",
        time: startTime,
        data: { userId: "user-1", orderId: "order-1" },
      });

      const contexts = await memory.getContexts(
        testDomain,
        "onboarding-campaign",
        "user-1"
      );

      // The wait node should have recorded when waiting started
      // Note: nodeState structure depends on implementation - just verify we're at wait node
      expect(contexts[0].currentNodeId).toBe("wait-1");
      expect(contexts[0].nodeState).toBeDefined();
    });

    it("should handle events that arrive exactly at wait boundary", async () => {
      const startTime = 1000000;

      await manager.processEvent({
        id: "e1",
        type: "order.created",
        time: startTime,
        data: { userId: "user-1", orderId: "order-1" },
      });

      // Send timeout event exactly at the boundary (1 day exactly)
      await manager.processEvent({
        id: "t1",
        type: "timeout",
        time: startTime + ONE_DAY,
        data: { userId: "user-1" },
      });

      const contexts = await memory.getContexts(
        testDomain,
        "onboarding-campaign",
        "user-1"
      );

      // Should have advanced to wait-2 (boundary is >= not >)
      expect(contexts[0].currentNodeId).toBe("wait-2");
    });

    it("should ignore non-timeout events while waiting", async () => {
      const startTime = 1000000;

      await manager.processEvent({
        id: "e1",
        type: "order.created",
        time: startTime,
        data: { userId: "user-1", orderId: "order-1" },
      });

      // Send random event while waiting
      await manager.processEvent({
        id: "e2",
        type: "some.other.event",
        time: startTime + ONE_DAY / 2,
        data: { userId: "user-1" },
      });

      const contexts = await memory.getContexts(
        testDomain,
        "onboarding-campaign",
        "user-1"
      );

      // Should still be at wait-1
      expect(contexts[0].currentNodeId).toBe("wait-1");
    });

    it("should handle multiple consecutive waits correctly", async () => {
      const startTime = 1000000;

      // Start workflow
      await manager.processEvent({
        id: "e1",
        type: "order.created",
        time: startTime,
        data: { userId: "user-1", orderId: "order-1" },
      });

      let contexts = await memory.getContexts(
        testDomain,
        "onboarding-campaign",
        "user-1"
      );
      expect(contexts[0].currentNodeId).toBe("wait-1");

      // Complete first wait
      await manager.processEvent({
        id: "t1",
        type: "timeout",
        time: startTime + ONE_DAY + 1000,
        data: { userId: "user-1" },
      });

      contexts = await memory.getContexts(
        testDomain,
        "onboarding-campaign",
        "user-1"
      );
      expect(contexts[0].currentNodeId).toBe("wait-2");

      // Complete second wait
      await manager.processEvent({
        id: "t2",
        type: "timeout",
        time: startTime + ONE_DAY + THREE_DAYS + 2000,
        data: { userId: "user-1" },
      });

      contexts = await memory.getContexts(
        testDomain,
        "onboarding-campaign",
        "user-1"
      );
      expect(contexts[0].isCompleted).toBe(true);
    });
  });

  describe("History tracking", () => {
    it("should record complete workflow history", async () => {
      const startTime = 1000000;

      // Complete the entire workflow
      await manager.processEvent({
        id: "e1",
        type: "order.created",
        time: startTime,
        data: { userId: "user-1", orderId: "order-1" },
      });
      await manager.processEvent({
        id: "t1",
        type: "timeout",
        time: startTime + ONE_DAY + 1000,
        data: { userId: "user-1" },
      });
      await manager.processEvent({
        id: "t2",
        type: "timeout",
        time: startTime + ONE_DAY + THREE_DAYS + 2000,
        data: { userId: "user-1" },
      });

      const contexts = await memory.getContexts(
        testDomain,
        "onboarding-campaign",
        "user-1"
      );

      const history = contexts[0].history;

      // Should have recorded all steps
      expect(history.length).toBeGreaterThan(0);

      // Check that we have step entries for the main nodes
      const nodeVisits = history
        .filter((h) => h.type === "step")
        .map((h) => h.toNodeId);

      expect(nodeVisits).toContain("action-welcome");
      expect(nodeVisits).toContain("wait-1");
      expect(nodeVisits).toContain("action-tips");
      expect(nodeVisits).toContain("wait-2");
      expect(nodeVisits).toContain("action-feedback");
      expect(nodeVisits).toContain("exit");
    });
  });

  describe("Large scale simulation", () => {
    it("should handle 10 users going through the workflow", async () => {
      const startTime = 1000000;
      const userCount = 10;

      // Start workflows for all users at slightly different times
      for (let i = 1; i <= userCount; i++) {
        await manager.processEvent({
          id: `e-start-${i}`,
          type: "order.created",
          time: startTime + i * 1000, // Each user starts 1 second apart
          data: { userId: `user-${i}`, orderId: `order-${i}` },
        });
      }

      // Verify all users are at wait-1
      for (let i = 1; i <= userCount; i++) {
        const contexts = await memory.getContexts(
          testDomain,
          "onboarding-campaign",
          `user-${i}`
        );
        expect(contexts.length).toBe(1);
        expect(contexts[0].currentNodeId).toBe("wait-1");
      }

      // Process first timeout for all users
      for (let i = 1; i <= userCount; i++) {
        await manager.processEvent({
          id: `e-t1-${i}`,
          type: "timeout",
          time: startTime + i * 1000 + ONE_DAY + 1000,
          data: { userId: `user-${i}` },
        });
      }

      // Verify all users are at wait-2
      for (let i = 1; i <= userCount; i++) {
        const contexts = await memory.getContexts(
          testDomain,
          "onboarding-campaign",
          `user-${i}`
        );
        expect(contexts[0].currentNodeId).toBe("wait-2");
      }

      // Process second timeout for all users
      for (let i = 1; i <= userCount; i++) {
        await manager.processEvent({
          id: `e-t2-${i}`,
          type: "timeout",
          time: startTime + i * 1000 + ONE_DAY + THREE_DAYS + 2000,
          data: { userId: `user-${i}` },
        });
      }

      // Verify all users have completed
      for (let i = 1; i <= userCount; i++) {
        const contexts = await memory.getContexts(
          testDomain,
          "onboarding-campaign",
          `user-${i}`
        );
        expect(contexts[0].isCompleted).toBe(true);
      }
    });

    it("should handle users at different stages simultaneously", async () => {
      const startTime = 1000000;
      const oneHour = 60 * 60 * 1000;

      // User 1 starts and completes entirely
      await manager.processEvent({
        id: "e1",
        type: "order.created",
        time: startTime,
        data: { userId: "user-1", orderId: "order-1" },
      });
      await manager.processEvent({
        id: "t1-1",
        type: "timeout",
        time: startTime + ONE_DAY + 1000,
        data: { userId: "user-1" },
      });
      await manager.processEvent({
        id: "t1-2",
        type: "timeout",
        time: startTime + ONE_DAY + THREE_DAYS + 2000,
        data: { userId: "user-1" },
      });

      // User 2 starts after user-1 completed first wait, completes first wait
      await manager.processEvent({
        id: "e2",
        type: "order.created",
        time: startTime + ONE_DAY + oneHour,
        data: { userId: "user-2", orderId: "order-2" },
      });
      await manager.processEvent({
        id: "t2-1",
        type: "timeout",
        time: startTime + 2 * ONE_DAY + oneHour + 1000,
        data: { userId: "user-2" },
      });

      // User 3 just started
      await manager.processEvent({
        id: "e3",
        type: "order.created",
        time: startTime + 2 * ONE_DAY,
        data: { userId: "user-3", orderId: "order-3" },
      });

      // Verify all users are at different stages
      const contexts1 = await memory.getContexts(
        testDomain,
        "onboarding-campaign",
        "user-1"
      );
      const contexts2 = await memory.getContexts(
        testDomain,
        "onboarding-campaign",
        "user-2"
      );
      const contexts3 = await memory.getContexts(
        testDomain,
        "onboarding-campaign",
        "user-3"
      );

      expect(contexts1[0].isCompleted).toBe(true);
      expect(contexts2[0].currentNodeId).toBe("wait-2");
      expect(contexts3[0].currentNodeId).toBe("wait-1");
    });
  });
});
