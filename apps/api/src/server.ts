import { createApp } from "./app";
import { env } from "./config/env";
import { logger } from "./lib/logger";
import { startBackgroundJobs, stopBackgroundJobs } from "./jobs/scheduler";

const app = createApp();

const server = app.listen(env.PORT, () => {
  logger.info(`Antigravity API listening on :${env.PORT} (${env.NODE_ENV})`);
  startBackgroundJobs();
});

process.on("SIGTERM", () => {
  logger.info("SIGTERM received, shutting down gracefully");
  stopBackgroundJobs();
  server.close(() => process.exit(0));
});
