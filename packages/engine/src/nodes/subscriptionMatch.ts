import type { Context } from "@omega-flow/types";

import type { SubscriptionRequest } from "../engine/NodeModel";
import { SUBSCRIPTION_WILDCARD } from "../manager/SubscriptionStore";
import { resolveTemplate } from "./templateResolver";

/** Default subscription TTL safety net when the node has no timeout. */
const DEFAULT_TTL_SECONDS = 90 * 24 * 60 * 60; // 90 days
/** Margin added on top of a node's timeout duration. */
const TTL_MARGIN_SECONDS = 24 * 60 * 60; // 1 day

/**
 * Optional `params.match` section on trigger-like nodes. Its presence makes
 * the node a cross-subject wait: while the workflow is parked on the node,
 * a subscription is registered so matching events from other subject spaces
 * resume this instance.
 */
export interface MatchParams {
  /**
   * Template resolving to the subject id of the source event to wait for,
   * e.g. `product:{{trigger.payload.products[0].product_id}}`. Placeholders
   * are resolved against the instance context at park time (`trigger` is the
   * data of the event that started the instance). Omit for a wildcard
   * subscription (any event of that type in the domain).
   */
  subjectId?: string;
}

/**
 * Build a SubscriptionRequest from trigger-like node params
 * (`{ event, duration?, match? }`).
 *
 * Returns null when there is no `match` section (the node waits in its own
 * subject space — today's behavior) or when the match subject-id template
 * cannot be resolved from the context; in the latter case a warning is logged and
 * no subscription is registered, so the instance can only resume via its
 * own subject's events (e.g. the node's timeout).
 */
export function resolveSubscriptionFromParams(
  params: { event?: string; duration?: number; match?: MatchParams } | undefined,
  context: Context,
  nodeId: string
): SubscriptionRequest | null {
  const match = params?.match;
  const eventType = params?.event;
  if (!match || typeof eventType !== "string" || eventType === "") {
    return null;
  }

  let matchSubjectId: string = SUBSCRIPTION_WILDCARD;
  if (match.subjectId != null && match.subjectId !== "") {
    const resolved = resolveTemplate(String(match.subjectId), {
      trigger: context.triggerEvent?.data ?? {},
    });
    if (resolved === undefined || resolved === "") {
      console.warn(
        `Node ${nodeId}: could not resolve subscription match subject id ` +
          `"${match.subjectId}" from the instance context — no subscription registered`
      );
      return null;
    }
    matchSubjectId = resolved;
  }

  const duration =
    typeof params?.duration === "number" ? params.duration : undefined;
  const ttlSeconds =
    duration !== undefined
      ? Math.ceil(duration / 1000) + TTL_MARGIN_SECONDS
      : DEFAULT_TTL_SECONDS;

  return { eventType, matchSubjectId, ttlSeconds };
}
