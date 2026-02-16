import { readdir, readFile, writeFile, mkdir, unlink, rm } from "fs/promises";
import { join } from "path";
import type { Context } from "@omega-flow/types";
import type { WorkflowMemory } from "@omega-flow/engine";

/**
 * File-based implementation of WorkflowMemory.
 *
 * Storage structure: db/contexts/{domain}/{subjectId}/{workflowId}/{instanceId}.json
 */
export class FileWorkflowMemory implements WorkflowMemory {
  private basePath: string;

  constructor(basePath: string) {
    this.basePath = basePath;
  }

  private getDomainPath(domain: string): string {
    return join(this.basePath, "contexts", domain);
  }

  private getSubjectPath(domain: string, subjectId: string): string {
    return join(this.getDomainPath(domain), subjectId);
  }

  private getWorkflowPath(domain: string, subjectId: string, workflowId: string): string {
    return join(this.getSubjectPath(domain, subjectId), workflowId);
  }

  private getContextPath(domain: string, subjectId: string, workflowId: string, instanceId: string): string {
    return join(this.getWorkflowPath(domain, subjectId, workflowId), `${instanceId}.json`);
  }

  async getContexts(domain: string, workflowId: string, subjectId: string): Promise<Context[]> {
    try {
      const workflowPath = this.getWorkflowPath(domain, subjectId, workflowId);
      const files = await readdir(workflowPath);
      const contexts: Context[] = [];

      for (const file of files) {
        if (file.endsWith(".json")) {
          const content = await readFile(join(workflowPath, file), "utf-8");
          contexts.push(JSON.parse(content) as Context);
        }
      }

      return contexts;
    } catch (error: unknown) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return [];
      }
      throw error;
    }
  }

  async getContext(domain: string, workflowId: string, subjectId: string, instanceId: string): Promise<Context | null> {
    try {
      const filePath = this.getContextPath(domain, subjectId, workflowId, instanceId);
      const content = await readFile(filePath, "utf-8");
      return JSON.parse(content) as Context;
    } catch (error: unknown) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return null;
      }
      throw error;
    }
  }

  async getAllContextsForSubject(domain: string, subjectId: string): Promise<Context[]> {
    try {
      const subjectPath = this.getSubjectPath(domain, subjectId);
      const workflowDirs = await readdir(subjectPath);
      const contexts: Context[] = [];

      for (const workflowId of workflowDirs) {
        const workflowContexts = await this.getContexts(domain, workflowId, subjectId);
        contexts.push(...workflowContexts);
      }

      return contexts;
    } catch (error: unknown) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return [];
      }
      throw error;
    }
  }

  async saveContext(domain: string, workflowId: string, subjectId: string, context: Context): Promise<void> {
    const workflowPath = this.getWorkflowPath(domain, subjectId, workflowId);
    await mkdir(workflowPath, { recursive: true });

    const filePath = this.getContextPath(domain, subjectId, workflowId, context.instanceId);
    await writeFile(filePath, JSON.stringify(context, null, 2), "utf-8");
  }

  async getAllContexts(domain: string): Promise<Array<Context & { subjectId: string }>> {
    try {
      const domainPath = this.getDomainPath(domain);
      const subjects = await readdir(domainPath);
      const allContexts: Array<Context & { subjectId: string }> = [];

      for (const subjectId of subjects) {
        const subjectContexts = await this.getAllContextsForSubject(domain, subjectId);
        for (const ctx of subjectContexts) {
          allContexts.push({ ...ctx, subjectId });
        }
      }

      return allContexts;
    } catch (error: unknown) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return [];
      }
      throw error;
    }
  }

  async deleteContext(domain: string, workflowId: string, subjectId: string, instanceId: string): Promise<void> {
    try {
      const filePath = this.getContextPath(domain, subjectId, workflowId, instanceId);
      await unlink(filePath);

      // Clean up empty workflow directory
      const workflowPath = this.getWorkflowPath(domain, subjectId, workflowId);
      const workflowFiles = await readdir(workflowPath);
      if (workflowFiles.length === 0) {
        await rm(workflowPath, { recursive: true });

        // Clean up empty subject directory
        const subjectPath = this.getSubjectPath(domain, subjectId);
        const subjectDirs = await readdir(subjectPath);
        if (subjectDirs.length === 0) {
          await rm(subjectPath, { recursive: true });

          // Clean up empty domain directory
          const domainPath = this.getDomainPath(domain);
          const domainDirs = await readdir(domainPath);
          if (domainDirs.length === 0) {
            await rm(domainPath, { recursive: true });
          }
        }
      }
    } catch (error: unknown) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return; // Silently ignore if context doesn't exist
      }
      throw error;
    }
  }
}
