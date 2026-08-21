import type { Event } from "@omega-flow/types";

import type NodeModel from "./NodeModel";

/**
 * The object all dynamic values (`{{path}}` templates, prefixed condition
 * facts) resolve against. Built fresh by the WorkflowModel before every node
 * call, so `state` always reflects what earlier nodes wrote — including
 * writes made earlier in the same event's processing chain.
 */
export type ResolutionScope = {
  /** Data payload of the event currently being processed */
  event: Record<string, unknown>;
  /** Data payload of the event that started this workflow instance */
  trigger: Record<string, unknown>;
  /**
   * Every node's saved state, keyed by node id. References always use the
   * id — stable across renames; node names (`data.name`) are display-only
   * and never bound here.
   */
  state: Record<string, unknown>;
};

/** An empty scope, used when a node runs outside a workflow (e.g. unit tests). */
export function emptyResolutionScope(): ResolutionScope {
  return { event: {}, trigger: {}, state: {} };
}

/**
 * Build the resolution scope for one node call.
 *
 * @param nodes - All nodes of the workflow (their state is exposed)
 * @param event - The event currently being processed
 * @param triggerEvent - The event that started the instance; while the start
 *          node itself is processing this is not captured yet, so callers
 *          pass the current event as the trigger candidate
 */
export function buildResolutionScope(
  nodes: NodeModel[],
  event: Event | undefined,
  triggerEvent: Event | undefined
): ResolutionScope {
  return {
    event: asRecord(event?.data),
    trigger: asRecord(triggerEvent?.data),
    state: buildStateScope(nodes),
  };
}

/**
 * Key every node's state by node id. Ids are the only reference format —
 * node names are a display concern and renaming must never break templates.
 */
export function buildStateScope(nodes: NodeModel[]): Record<string, unknown> {
  const state: Record<string, unknown> = {};
  for (const node of nodes) {
    state[node.getId()] = node.getState();
  }
  return state;
}

function asRecord(value: unknown): Record<string, unknown> {
  if (value !== null && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}
