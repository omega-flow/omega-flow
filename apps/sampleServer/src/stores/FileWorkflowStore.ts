import { readdir, readFile, writeFile, mkdir, unlink, rm } from "fs/promises";
import { join } from "path";
import type { Workflow } from "@omega-flow/types";
import type { WorkflowStore } from "@omega-flow/engine";
import { nanoid } from "nanoid";

export class FileWorkflowStore implements WorkflowStore {
  private basePath: string;

  constructor(basePath: string) {
    this.basePath = basePath;
  }

  private getDomainPath(domain: string): string {
    return join(this.basePath, "workflows", domain);
  }

  private getWorkflowPath(domain: string, workflowId: string): string {
    return join(this.getDomainPath(domain), `${workflowId}.json`);
  }

  async getWorkflow(domain: string, workflowId: string): Promise<Workflow | null> {
    try {
      const filePath = this.getWorkflowPath(domain, workflowId);
      const content = await readFile(filePath, "utf-8");
      return JSON.parse(content) as Workflow;
    } catch (error: unknown) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return null;
      }
      throw error;
    }
  }

  async getAllWorkflows(domain: string): Promise<Workflow[]> {
    try {
      const domainPath = this.getDomainPath(domain);
      const files = await readdir(domainPath);
      const workflows: Workflow[] = [];

      for (const file of files) {
        if (file.endsWith(".json")) {
          const content = await readFile(join(domainPath, file), "utf-8");
          workflows.push(JSON.parse(content) as Workflow);
        }
      }

      return workflows;
    } catch (error: unknown) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return [];
      }
      throw error;
    }
  }

  async setWorkflow(domain: string, workflow: Workflow): Promise<void> {
    const domainPath = this.getDomainPath(domain);
    await mkdir(domainPath, { recursive: true });

    const filePath = this.getWorkflowPath(domain, workflow.id);
    await writeFile(filePath, JSON.stringify(workflow, null, 2), "utf-8");
  }

  async createWorkflow(domain: string, workflowData: Omit<Workflow, "id">): Promise<Workflow> {
    const id = nanoid(8);
    const workflow: Workflow = {
      ...workflowData,
      id,
    };

    await this.setWorkflow(domain, workflow);
    return workflow;
  }

  async deleteWorkflow(domain: string, workflowId: string): Promise<boolean> {
    try {
      const filePath = this.getWorkflowPath(domain, workflowId);
      await unlink(filePath);

      // Clean up empty domain directory
      const domainPath = this.getDomainPath(domain);
      const files = await readdir(domainPath);
      if (files.length === 0) {
        await rm(domainPath, { recursive: true });
      }

      return true;
    } catch (error: unknown) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return false;
      }
      throw error;
    }
  }
}
