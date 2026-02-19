import type { WorkflowScheduler } from "../manager/WorkflowScheduler";

export interface NodeServices {
  scheduler?: WorkflowScheduler;
}
