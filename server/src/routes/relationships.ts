import { Hono } from "hono";
import { eq, lte, sql } from "drizzle-orm";
import { db } from "../db/index.js";
import {
  networkContacts,
  contactCategories,
  relationshipHealth,
} from "../db/schema.js";
import { authMiddleware, type AuthUser } from "../middleware/auth.js";
import { recomputeAll } from "../services/health.js";

export const relationshipRoutes = new Hono<{ Variables: { user: AuthUser } }>();

relationshipRoutes.use("*", authMiddleware);

// GET /relationships/health — All contacts sorted by health score
relationshipRoutes.get("/health", async (c) => {
  const user = c.get("user");
  const categoryFilter = c.req.query("category");

  const contacts = await db.query.networkContacts.findMany({
    where: eq(networkContacts.userId, user.sub),
  });

  const health = await db.query.relationshipHealth.findMany();
  const healthMap = new Map(health.map((h) => [h.networkContactId, h]));

  const categories = await db.query.contactCategories.findMany();
  const catMap = new Map(categories.map((cat) => [cat.networkContactId, cat]));

  let results = contacts.map((contact) => ({
    id: contact.id,
    displayName: contact.displayName,
    email: contact.email,
    company: contact.company,
    category: catMap.get(contact.id)?.category ?? null,
    health: healthMap.get(contact.id) ?? null,
    lastContactAt: contact.lastContactAt,
    lastDirection: contact.lastDirection,
  }));

  if (categoryFilter) {
    results = results.filter((r) => r.category === categoryFilter);
  }

  // Sort by health score ascending (worst first)
  results.sort((a, b) => (a.health?.score ?? 0) - (b.health?.score ?? 0));

  return c.json({ contacts: results });
});

// GET /relationships/needs-attention — Contacts needing attention
relationshipRoutes.get("/needs-attention", async (c) => {
  const user = c.get("user");

  const contacts = await db.query.networkContacts.findMany({
    where: eq(networkContacts.userId, user.sub),
  });

  const health = await db.query.relationshipHealth.findMany();
  const healthMap = new Map(health.map((h) => [h.networkContactId, h]));

  const categories = await db.query.contactCategories.findMany();
  const catMap = new Map(categories.map((cat) => [cat.networkContactId, cat]));

  const needsAttention = contacts
    .map((contact) => ({
      id: contact.id,
      displayName: contact.displayName,
      email: contact.email,
      company: contact.company,
      category: catMap.get(contact.id)?.category ?? null,
      health: healthMap.get(contact.id) ?? null,
      lastContactAt: contact.lastContactAt,
      lastDirection: contact.lastDirection,
    }))
    .filter((r) => {
      if (!r.health) return false;
      return r.health.score < 0.4 || r.health.trend === "cooling";
    })
    .sort((a, b) => (a.health?.score ?? 0) - (b.health?.score ?? 0));

  return c.json({ contacts: needsAttention });
});

// POST /relationships/recompute — Trigger health recomputation
relationshipRoutes.post("/recompute", async (c) => {
  const user = c.get("user");
  const count = await recomputeAll(user.sub);
  return c.json({ updated: count });
});
