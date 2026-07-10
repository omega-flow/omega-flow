import { readFile, writeFile, mkdir } from "fs/promises";
import { join, dirname } from "path";
import { nanoid } from "nanoid";
import type { Event } from "@omega-flow/types";
import type { WorkflowScheduler } from "@omega-flow/engine";

interface IWorkflowManager {
  processEvent(event: Event): Promise<unknown>;
}

export interface ScheduledEvent {
  scheduleId: string;
  event: Event;
  fireAt: number;
  scheduledAt: number;
}

export class FileWorkflowScheduler implements WorkflowScheduler {
  private filePath: string;
  private workflowManager: IWorkflowManager | null = null;

  constructor(basePath: string) {
    this.filePath = join(basePath, "scheduler.json");
  }

  setWorkflowManager(manager: IWorkflowManager): void {
    this.workflowManager = manager;
  }

  async schedule(event: Event, delayMs: number): Promise<string> {
    const scheduleId = `schedule_${nanoid(8)}`;
    const now = Date.now();

    const entry: ScheduledEvent = {
      scheduleId,
      event,
      fireAt: now + delayMs,
      scheduledAt: now,
    };

    const entries = await this.readEntries();
    entries.push(entry);
    await this.writeEntries(entries);

    return scheduleId;
  }

  async cancel(scheduleId: string): Promise<boolean> {
    const entries = await this.readEntries();
    const index = entries.findIndex((e) => e.scheduleId === scheduleId);
    if (index === -1) return false;

    entries.splice(index, 1);
    await this.writeEntries(entries);
    return true;
  }

  async getAll(): Promise<ScheduledEvent[]> {
    return this.readEntries();
  }

  async remove(scheduleId: string): Promise<ScheduledEvent | null> {
    const entries = await this.readEntries();
    const index = entries.findIndex((e) => e.scheduleId === scheduleId);
    if (index === -1) return null;

    const [removed] = entries.splice(index, 1);
    await this.writeEntries(entries);
    return removed;
  }

  private async readEntries(): Promise<ScheduledEvent[]> {
    try {
      const content = await readFile(this.filePath, "utf-8");
      return JSON.parse(content) as ScheduledEvent[];
    } catch (error: unknown) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return [];
      }
      throw error;
    }
  }

  private async writeEntries(entries: ScheduledEvent[]): Promise<void> {
    await mkdir(dirname(this.filePath), { recursive: true });
    await writeFile(this.filePath, JSON.stringify(entries, null, 2), "utf-8");
  }
}
