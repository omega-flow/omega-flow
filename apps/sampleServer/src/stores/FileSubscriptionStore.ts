import { readFile, writeFile, mkdir } from "fs/promises";
import { join, dirname } from "path";
import type { Subscription, SubscriptionRef } from "@omega-flow/engine";
import {
  SUBSCRIPTION_WILDCARD,
  subscriptionKey,
  subscriptionTarget,
} from "@omega-flow/engine";
import type { SampleSubscriptionStore } from "./types.js";

/**
 * File-based implementation of SubscriptionStore.
 *
 * Storage structure: db/subscriptions.json (flat array of subscriptions)
 */
export class FileSubscriptionStore implements SampleSubscriptionStore {
  private filePath: string;

  constructor(basePath: string) {
    this.filePath = join(basePath, "subscriptions.json");
  }

  /** Opaque id used by the HTTP API: `subscriptionKey|target`. */
  static idOf(subscription: SubscriptionRef): string {
    return `${subscriptionKey(subscription)}|${subscriptionTarget(subscription)}`;
  }

  async put(subscription: Subscription): Promise<void> {
    const id = FileSubscriptionStore.idOf(subscription);
    const entries = await this.readEntries();
    const index = entries.findIndex(
      (entry) => FileSubscriptionStore.idOf(entry) === id
    );
    if (index === -1) {
      entries.push(subscription);
    } else {
      entries[index] = subscription;
    }
    await this.writeEntries(entries);
  }

  async match(
    domain: string,
    eventType: string,
    matchSubjectId: string
  ): Promise<Subscription[]> {
    const entries = await this.readEntries();
    const nowSeconds = Math.floor(Date.now() / 1000);

    // Prune expired entries while we're here (TTL safety net)
    const alive = entries.filter(
      (entry) => entry.ttl === undefined || entry.ttl > nowSeconds
    );
    if (alive.length !== entries.length) {
      await this.writeEntries(alive);
    }

    return alive.filter(
      (entry) =>
        entry.domain === domain &&
        entry.eventType === eventType &&
        (entry.matchSubjectId === matchSubjectId ||
          entry.matchSubjectId === SUBSCRIPTION_WILDCARD)
    );
  }

  async delete(subscriptions: SubscriptionRef[]): Promise<void> {
    if (subscriptions.length === 0) {
      return;
    }
    const ids = new Set(subscriptions.map(FileSubscriptionStore.idOf));
    const entries = await this.readEntries();
    const remaining = entries.filter(
      (entry) => !ids.has(FileSubscriptionStore.idOf(entry))
    );
    if (remaining.length !== entries.length) {
      await this.writeEntries(remaining);
    }
  }

  async getAll(): Promise<Subscription[]> {
    return this.readEntries();
  }

  async removeById(id: string): Promise<Subscription | null> {
    const entries = await this.readEntries();
    const index = entries.findIndex(
      (entry) => FileSubscriptionStore.idOf(entry) === id
    );
    if (index === -1) {
      return null;
    }
    const [removed] = entries.splice(index, 1);
    await this.writeEntries(entries);
    return removed ?? null;
  }

  private async readEntries(): Promise<Subscription[]> {
    try {
      const content = await readFile(this.filePath, "utf-8");
      return JSON.parse(content) as Subscription[];
    } catch (error: unknown) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return [];
      }
      throw error;
    }
  }

  private async writeEntries(entries: Subscription[]): Promise<void> {
    await mkdir(dirname(this.filePath), { recursive: true });
    await writeFile(this.filePath, JSON.stringify(entries, null, 2), "utf-8");
  }
}
