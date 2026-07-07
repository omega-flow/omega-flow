import type {
  WorkflowStore,
  WorkflowMemory,
  WorkflowScheduler,
  Subscription,
  SubscriptionStore,
} from "@omega-flow/engine";
import type { Context, Workflow } from "@omega-flow/types";

/**
 * Extended WorkflowStore with mutation methods used by the sample server API.
 * Both FileWorkflowStore and DynamoDBWorkflowStore implement these.
 */
export interface SampleWorkflowStore extends WorkflowStore {
  setWorkflow(domain: string, workflow: Workflow): Promise<void>;
  createWorkflow(domain: string, workflowData: Omit<Workflow, "id">): Promise<Workflow>;
  deleteWorkflow(domain: string, workflowId: string): Promise<boolean>;
}

/**
 * Extended WorkflowMemory with extra query methods used by the sample server API.
 * Both FileWorkflowMemory and DynamoDBWorkflowMemory implement all of these.
 */
export interface SampleWorkflowMemory extends WorkflowMemory {
  getContext(domain: string, workflowId: string, subjectId: string, instanceId: string): Promise<Context | null>;
  getAllContextsForSubject(domain: string, subjectId: string): Promise<Context[]>;
  getAllContexts(domain: string): Promise<Array<Context & { subjectId: string }>>;
}

/**
 * Extended WorkflowScheduler with inspection/management methods used by the
 * scheduler API routes. Only FileWorkflowScheduler implements these.
 */
export interface SampleWorkflowScheduler extends WorkflowScheduler {
  getAll?(): Promise<unknown[]>;
  remove?(scheduleId: string): Promise<unknown | null>;
  setWorkflowManager?(manager: { processEvent(event: unknown): Promise<void> }): void;
}

/**
 * Extended SubscriptionStore with inspection/management methods used by the
 * subscriptions API routes. Only FileSubscriptionStore implements these.
 */
export interface SampleSubscriptionStore extends SubscriptionStore {
  getAll?(): Promise<Subscription[]>;
  removeById?(id: string): Promise<Subscription | null>;
}
