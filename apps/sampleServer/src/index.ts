import express from "express";
import cors from "cors";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { FileWorkflowStore } from "./stores/FileWorkflowStore.js";
import { FileWorkflowMemory } from "./stores/FileWorkflowMemory.js";
import { FileWorkflowScheduler } from "./stores/FileWorkflowScheduler.js";
import { createWorkflowRoutes } from "./routes/workflows.js";
import { createContextRoutes } from "./routes/contexts.js";
import { createExecuteRoutes } from "./routes/execute.js";
import { createSchedulerRoutes } from "./routes/scheduler.js";
import type { SampleWorkflowStore, SampleWorkflowMemory, SampleWorkflowScheduler } from "./stores/types.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 5010;
const DB_PATH = process.env.DB_PATH || join(__dirname, "..", "db");
const STORAGE = process.env.STORAGE || "file";

async function createStores(): Promise<{
  workflowStore: SampleWorkflowStore;
  workflowMemory: SampleWorkflowMemory;
  workflowScheduler: SampleWorkflowScheduler;
}> {
  if (STORAGE === "dynamodb") {
    const { DynamoDBClient } = await import("@aws-sdk/client-dynamodb");
    const { DynamoDBWorkflowStore, DynamoDBWorkflowMemory } = await import("@omega-flow/store-aws");

    const region = process.env.AWS_REGION || "eu-central-1";
    const ddb = new DynamoDBClient({ region });

    const workflowStore = new DynamoDBWorkflowStore({
      client: ddb,
      tableName: process.env.DYNAMODB_WORKFLOWS_TABLE || "shoperman_flow_store",
    });

    const workflowMemory = new DynamoDBWorkflowMemory({
      client: ddb,
      tableName: process.env.DYNAMODB_CONTEXTS_TABLE || "shoperman_flow_memory",
    });

    // Scheduler stays file-based — schedules are managed locally
    const workflowScheduler = new FileWorkflowScheduler(DB_PATH);

    return { workflowStore, workflowMemory, workflowScheduler };
  }

  // Default: file-based storage
  return {
    workflowStore: new FileWorkflowStore(DB_PATH),
    workflowMemory: new FileWorkflowMemory(DB_PATH),
    workflowScheduler: new FileWorkflowScheduler(DB_PATH),
  };
}

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

const { workflowStore, workflowMemory, workflowScheduler } = await createStores();

// Mount routes
app.use("/api/workflows", createWorkflowRoutes(workflowStore));
app.use("/api/contexts", createContextRoutes(workflowMemory));
app.use("/api/execute", createExecuteRoutes(workflowStore, workflowMemory, workflowScheduler));
app.use("/api/scheduler", createSchedulerRoutes(workflowStore, workflowMemory, workflowScheduler));

// Health check
app.get("/health", (_req, res) => {
  res.json({ status: "ok", storage: STORAGE });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Storage: ${STORAGE}`);
  if (STORAGE === "dynamodb") {
    console.log(`  Workflows table: ${process.env.DYNAMODB_WORKFLOWS_TABLE || "shoperman_flow_store"}`);
    console.log(`  Contexts table:  ${process.env.DYNAMODB_CONTEXTS_TABLE || "shoperman_flow_memory"}`);
    console.log(`  Scheduler:       file-based (${DB_PATH})`);
  } else {
    console.log(`  DB path: ${DB_PATH}`);
  }
});
