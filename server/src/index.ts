import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { logger } from "hono/logger";
import { env } from "./config.js";
import { getAllowedOrigin, setCorsHeaders } from "./lib/cors.js";
import { contactRoutes } from "./routes/contacts.js";
import { relationshipRoutes } from "./routes/relationships.js";
import { reminderRoutes } from "./routes/reminders.js";
import { dashboardRoutes } from "./routes/dashboard.js";
import { importRoutes } from "./routes/import.js";
import { startScheduler } from "./services/scheduler.js";

const app = new Hono();

// Global error handler
app.onError((err, c) => {
  console.error("Unhandled error:", err);
  return c.json(
    { error: err.message || "Internal server error" },
    500,
  );
});

app.notFound((c) => c.json({ error: "Not found" }, 404));

app.use(logger());

// Global CORS preflight handler
app.use("*", async (c, next) => {
  const origin = getAllowedOrigin(c.req.header("origin"));

  if (c.req.method === "OPTIONS" && origin) {
    setCorsHeaders(c, origin);
    return c.body(null, 204);
  }

  await next();

  if (origin) {
    setCorsHeaders(c, origin);
  }
});

// Health check
app.get("/health", (c) => c.json({ status: "ok" }));

// API routes
app.route("/contacts", contactRoutes);
app.route("/relationships", relationshipRoutes);
app.route("/reminders", reminderRoutes);
app.route("/dashboard", dashboardRoutes);
app.route("/import", importRoutes);

serve({ fetch: app.fetch, port: env.PORT }, (info) => {
  console.log(`Apollonia is running on http://localhost:${info.port}`);

  // Start the daily scheduler
  startScheduler();
});

export default app;
