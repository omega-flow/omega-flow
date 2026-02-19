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

const __dirname = dirname(fileURLToPath(import.meta.url));

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 5010;
const DB_PATH = process.env.DB_PATH || join(__dirname, "..", "db");

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Initialize stores
const workflowStore = new FileWorkflowStore(DB_PATH);
const workflowMemory = new FileWorkflowMemory(DB_PATH);
const workflowScheduler = new FileWorkflowScheduler(DB_PATH);

// Mount routes
app.use("/api/workflows", createWorkflowRoutes(workflowStore));
app.use("/api/contexts", createContextRoutes(workflowMemory));
app.use("/api/execute", createExecuteRoutes(workflowStore, workflowMemory, workflowScheduler));
app.use("/api/scheduler", createSchedulerRoutes(workflowStore, workflowMemory, workflowScheduler));

// Health check
app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`DB path: ${DB_PATH}`);
});
