// src/server.js
import app from "./app.js";
import { env } from "./config/env.js";
import { disconnectPrisma } from "./db/prisma.js";

const server = app.listen(env.PORT, async () => {
  console.log(`API running on port ${env.PORT}`);
});

async function shutdown(signal) {
  console.log(`Received ${signal}. Shutting down...`);
  server.close(async () => {
    await disconnectPrisma();
    process.exit(0);
  });
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
