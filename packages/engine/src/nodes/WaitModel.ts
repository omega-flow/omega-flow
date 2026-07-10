import { type Node, type Event } from "@omega-flow/types";

import NodeModel from "./../engine/NodeModel";

/**
 * Node that pauses workflow execution for a specified duration.
 *
 * WaitModel implements a time-based delay in the workflow. On the first event,
 * it starts waiting and returns false (not accepted). Subsequent events check
 * if the wait duration has elapsed. Once complete, the node accepts the event
 * and proceeds to the next node.
 *
 * The wait duration is configured in the node's data.params.duration field
 * (in milliseconds).
 *
 * State tracking:
 * - `waitStartsAt`: Timestamp when waiting began
 * - `waitEndsAt`: Timestamp when waiting completed
 *
 * @example
 * ```json
 * {
 *   "id": "wait-1",
 *   "type": "Wait",
 *   "data": {
 *     "params": { "duration": 60000 }
 *   }
 * }
 * ```
 */
export default class WaitModel extends NodeModel {
  /**
   * Creates a new WaitModel instance.
   * @param node - The node definition from the workflow
   */
  constructor(node: Node) {
    super(node);
  }

  /**
   * Factory method to create a WaitModel with type validation.
   * @param node - The node definition from the workflow
   * @returns A new WaitModel instance
   * @throws Error if node type is not "Wait"
   */
  static create(node: Node): WaitModel {
    if (node.type !== "Wait") {
      throw new Error("Node type must be of type Wait");
    }
    return new this(node);
  }

  /**
   * Checks if the node is currently in a waiting state.
   * @returns True if waiting has been started but not completed
   */
  isWaiting(): boolean {
    const state = this.getState();
    return state && state.waitStartsAt !== undefined;
  }

  /**
   * Starts the waiting period by recording the start time and scheduling a
   * timeout event.
   *
   * The timeout copy carries the source event's envelope routing
   * (`domain`/`subjectId`) so that, when it fires, it routes straight back to
   * this instance's subject — the host never has to re-derive routing from the
   * payload (no `eventExtractor` fallback required).
   * @param event - The event that started the wait; source of both routing
   *   (envelope `domain`/`subjectId`) and the payload carried forward
   */
  async startWaiting(event: Event) {
    this.updateState({ waitStartsAt: event.time });

    if (this.services.scheduler) {
      const duration = this.getData().params.duration || 0;
      const timeoutEvent: Event = {
        id: `timeout_${this.getId()}_${Date.now()}`,
        type: "system:timeout",
        time: event.time + duration,
        domain: event.domain,
        subjectId: event.subjectId,
        data: event.data,
      };
      await this.services.scheduler.schedule(timeoutEvent, duration);
    }
  }

  /**
   * Stops the waiting period by recording the end time.
   * @param time - The timestamp when waiting ends
   */
  stopWaiting(time: number) {
    this.updateState({ waitEndsAt: time });
  }

  /**
   * Checks if the configured wait duration has elapsed.
   * @param currentTime - The current timestamp to check against
   * @returns True if waiting and the duration has passed, false otherwise
   */
  isWaitComplete(currentTime: number): boolean {
    if (this.isWaiting()) {
      const state = this.getState();
      const nodeData = this.getData();
      const waitDuration = nodeData.params.duration || 0;
      return currentTime >= state.waitStartsAt + waitDuration;
    }
    return false;
  }

  /**
   * Processes events during the waiting period.
   * - First event: Starts waiting and returns false
   * - Subsequent events: Checks if wait is complete
   *   - If complete: Stops waiting and returns true
   *   - If not complete: Returns false (still waiting)
   * @param event - The event being processed
   * @returns True if wait is complete and event is accepted, false if still waiting
   */
  async acceptEvent(event: Event): Promise<boolean> {
    if (this.isWaiting()) {
      // Wait is over, stop waiting and accept event only if complete
      if (this.isWaitComplete(event.time)) {
        this.stopWaiting(event.time);
        return true;
      }
      // Not complete, stay pending
      return false;
    } else {
      // Start waiting and stay pending
      await this.startWaiting(event);
      return false;
    }
  }

  /**
   * Returns the next node connected to this wait node's output.
   * @param _event - The event being processed (unused)
   * @returns The next NodeModel, or null if no connection exists
   */
  async nextNode(_event: Event): Promise<NodeModel | null> {
    return this.getDefaultNext();
  }
}
