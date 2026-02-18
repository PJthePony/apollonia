import { Hono } from "hono";
import { eq, and, sql } from "drizzle-orm";
import { db } from "../db/index.js";
import {
  networkContacts,
  contactCategories,
  relationshipHealth,
  thoughtfulReminders,
} from "../db/schema.js";
import { authMiddleware, type AuthUser } from "../middleware/auth.js";

export const dashboardRoutes = new Hono<{ Variables: { user: AuthUser } }>();

dashboardRoutes.use("*", authMiddleware);

// GET /dashboard — Aggregated stats for the relationship dashboard
dashboardRoutes.get("/", async (c) => {
  const user = c.get("user");

  const [contacts, categories, health, reminders] = await Promise.all([
    db.query.networkContacts.findMany({
      where: eq(networkContacts.userId, user.sub),
    }),
    db.query.contactCategories.findMany(),
    db.query.relationshipHealth.findMany(),
    db.query.thoughtfulReminders.findMany({
      where: and(
        eq(thoughtfulReminders.userId, user.sub),
        sql`(${thoughtfulReminders.status} = 'pending' OR (${thoughtfulReminders.status} = 'snoozed' AND ${thoughtfulReminders.snoozedUntil} <= CURRENT_DATE))`,
      ),
    }),
  ]);

  const catMap = new Map(categories.map((cat) => [cat.networkContactId, cat]));
  const healthMap = new Map(health.map((h) => [h.networkContactId, h]));

  // Category breakdown
  const categoryBreakdown: Record<string, number> = {
    personal: 0,
    professional: 0,
    family: 0,
    acquaintance: 0,
    uncategorized: 0,
  };

  let totalScore = 0;
  let scoredCount = 0;
  let needsAttentionCount = 0;

  for (const contact of contacts) {
    const cat = catMap.get(contact.id);
    const h = healthMap.get(contact.id);

    if (cat) {
      categoryBreakdown[cat.category] = (categoryBreakdown[cat.category] || 0) + 1;
    } else {
      categoryBreakdown.uncategorized++;
    }

    if (h) {
      totalScore += h.score;
      scoredCount++;
      if (h.score < 0.4 || h.trend === "cooling") {
        needsAttentionCount++;
      }
    }
  }

  return c.json({
    totalContacts: contacts.length,
    categoryBreakdown,
    averageHealth: scoredCount > 0 ? Math.round((totalScore / scoredCount) * 100) / 100 : null,
    needsAttention: needsAttentionCount,
    pendingReminders: reminders.length,
  });
});
