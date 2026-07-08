import express from "express";
import cors from "cors";
import healthRoutes from "./routes/health.routes.js";
import authRoutes from "./routes/auth.routes.js";
import applicationRoutes from "./routes/applications.routes.js";
import interviewRoutes from "./routes/interviews.routes.js";
import importRoutes from "./routes/imports.routes.js";
import parserRoutes from "./routes/parser.routes.js";
import { env } from "./config/env.js";
import { errorHandler, notFoundHandler } from "./middleware/error.middleware.js";

export function createApp() {
  const app = express();

  app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));
  app.use(express.json());

  app.use("/health", healthRoutes);
  app.use("/auth", authRoutes);
  app.use("/applications", applicationRoutes);
  app.use("/interviews", interviewRoutes);
  app.use("/imports", importRoutes);
  app.use("/parser", parserRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
