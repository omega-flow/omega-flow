import type { Event } from "@omega-flow/types";

/**
 * Minimal interface for WorkflowManager used by schedulers.
 * This forward declaration avoids circular dependency issues.
 */
export interface IWorkflowManager {
  /**
   * Process an event through the workflow system.
   * @param event - The event to process
   */
  processEvent(event: Event): Promise<void>;
}

/**
 * Interface for scheduling future workflow events
 * Used for timeouts, delays, and other time-based workflow events
 */
export interface WorkflowScheduler {
  /**
   * Schedule an event to be delivered after a delay
   * When the delay expires, the event will be passed to the workflow manager
   * @param event - The event to schedule
   * @param delayMs - Delay in milliseconds before the event is delivered
   * @returns Promise resolving to a schedule ID that can be used to cancel the schedule
   */
  schedule(event: Event, delayMs: number): Promise<string>;

  /**
   * Cancel a scheduled event
   * @param scheduleId - The ID of the schedule to cancel
   * @returns Promise resolving to true if canceled, false if not found
   */
  cancel(scheduleId: string): Promise<boolean>;
}
