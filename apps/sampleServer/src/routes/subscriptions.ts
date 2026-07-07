import { Router } from "express";
import { subscriptionKey, subscriptionTarget } from "@omega-flow/engine";
import type { SampleSubscriptionStore } from "../stores/types.js";

export function createSubscriptionRoutes(
  subscriptionStore: SampleSubscriptionStore
): Router {
  const router = Router();

  // GET /api/subscriptions - List active subscriptions (optionally ?domain=)
  router.get("/", async (req, res) => {
    try {
      if (!subscriptionStore.getAll) {
        res.status(501).json({
          error:
            "Listing subscriptions is not supported with the current subscription store backend",
        });
        return;
      }
      const domain = req.query.domain as string | undefined;
      let subscriptions = await subscriptionStore.getAll();
      if (domain) {
        subscriptions = subscriptions.filter((sub) => sub.domain === domain);
      }
      res.json(
        subscriptions.map((sub) => ({
          ...sub,
          id: `${subscriptionKey(sub)}|${subscriptionTarget(sub)}`,
          subscriptionKey: subscriptionKey(sub),
          target: subscriptionTarget(sub),
        }))
      );
    } catch (error) {
      console.error("Error fetching subscriptions:", error);
      res.status(500).json({
        error: "Failed to fetch subscriptions",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  // DELETE /api/subscriptions/:id - Manually remove a subscription
  // (:id is the URL-encoded `subscriptionKey|target` returned by the list)
  router.delete("/:id", async (req, res) => {
    try {
      if (!subscriptionStore.removeById) {
        res.status(501).json({
          error:
            "Removing subscriptions is not supported with the current subscription store backend",
        });
        return;
      }
      const removed = await subscriptionStore.removeById(req.params.id);
      if (!removed) {
        res.status(404).json({ error: "Subscription not found" });
        return;
      }
      res.json({ success: true, removed });
    } catch (error) {
      console.error("Error removing subscription:", error);
      res.status(500).json({
        error: "Failed to remove subscription",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  return router;
}
