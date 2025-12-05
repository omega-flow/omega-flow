import type { Event } from "@omega-flow/types";
import type { WorkflowScheduler, IWorkflowManager } from "../WorkflowScheduler";

/**
 * In-memory implementation of WorkflowScheduler using setTimeout
 * Stores scheduled events in memory with their timeout handles
 */
export class InMemoryWorkflowScheduler implements WorkflowScheduler {
  private schedules: Map<string, ReturnType<typeof setTimeout>>;
  private scheduleIdCounter: number;
  private workflowManager: IWorkflowManager | null;

  constructor() {
    this.schedules = new Map();
    this.scheduleIdCounter = 0;
    this.workflowManager = null;
  }

  /**
   * Set the workflow manager reference
   * The scheduler will call processEvent on the manager when scheduled events are due
   * @param manager - The workflow manager instance
   */
  setWorkflowManager(manager: IWorkflowManager): void {
    this.workflowManager = manager;
  }

  /**
   * Schedule an event to be delivered after a delay
   * When the delay expires, the event will be passed to the workflow manager
   * @param event - The event to schedule
   * @param delayMs - Delay in milliseconds before the event is delivered
   * @returns Promise resolving to a schedule ID that can be used to cancel
   */
  async schedule(event: Event, delayMs: number): Promise<string> {
    if (!this.workflowManager) {
      throw new Error(
        "WorkflowManager not set. Call setWorkflowManager() before scheduling events."
      );
    }

    const scheduleId = `schedule_${++this.scheduleIdCounter}`;

    const timeoutHandle = setTimeout(async () => {
      this.schedules.delete(scheduleId);
      if (this.workflowManager) {
        await this.workflowManager.processEvent(event);
      }
    }, delayMs);

    this.schedules.set(scheduleId, timeoutHandle);
    return scheduleId;
  }

  /**
   * Cancel a scheduled event
   * @param scheduleId - The ID of the schedule to cancel
   * @returns Promise resolving to true if canceled, false if not found
   */
  async cancel(scheduleId: string): Promise<boolean> {
    const timeoutHandle = this.schedules.get(scheduleId);
    if (!timeoutHandle) {
      return false;
    }

    clearTimeout(timeoutHandle);
    this.schedules.delete(scheduleId);
    return true;
  }

  /**
   * Get the number of currently scheduled events
   * @returns The count of active schedules
   */
  getScheduleCount(): number {
    return this.schedules.size;
  }

  /**
   * Cancel all scheduled events
   */
  async cancelAll(): Promise<void> {
    for (const timeoutHandle of this.schedules.values()) {
      clearTimeout(timeoutHandle);
    }
    this.schedules.clear();
  }
}
