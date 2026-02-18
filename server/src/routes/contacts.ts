import { Hono } from "hono";
import { eq, and } from "drizzle-orm";
import { db } from "../db/index.js";
import {
  networkContacts,
  contactContext,
  senderSummaries,
  contactCategories,
  relationshipHealth,
  relationshipPreferences,
  thoughtfulReminders,
} from "../db/schema.js";
import { authMiddleware, type AuthUser } from "../middleware/auth.js";
import { categorizeOne } from "../services/categorizer.js";

export const contactRoutes = new Hono<{ Variables: { user: AuthUser } }>();

contactRoutes.use("*", authMiddleware);

// GET /contacts — List all contacts enriched with category + health
contactRoutes.get("/", async (c) => {
  const user = c.get("user");

  const contacts = await db.query.networkContacts.findMany({
    where: eq(networkContacts.userId, user.sub),
  });

  const categories = await db.query.contactCategories.findMany();
  const catMap = new Map(categories.map((cat) => [cat.networkContactId, cat]));

  const health = await db.query.relationshipHealth.findMany();
  const healthMap = new Map(health.map((h) => [h.networkContactId, h]));

  const summaries = await db.query.senderSummaries.findMany({
    where: eq(senderSummaries.userId, user.sub),
  });
  const summaryMap = new Map(summaries.map((s) => [s.senderEmail.toLowerCase(), s]));

  const enriched = contacts.map((contact) => {
    const cat = catMap.get(contact.id);
    const h = healthMap.get(contact.id);
    const summary = summaryMap.get(contact.email.toLowerCase());

    return {
      ...contact,
      category: cat
        ? { category: cat.category, subcategory: cat.subcategory, manuallySet: cat.manuallySet }
        : null,
      health: h
        ? { score: h.score, trend: h.trend }
        : null,
      senderSummary: summary?.summary ?? null,
    };
  });

  // Sort: needs attention first (low health / cooling), then alphabetical
  enriched.sort((a, b) => {
    const aScore = a.health?.score ?? 0.5;
    const bScore = b.health?.score ?? 0.5;
    if (aScore !== bScore) return aScore - bScore;
    return a.displayName.localeCompare(b.displayName);
  });

  return c.json({ contacts: enriched });
});

// GET /contacts/:id — Full contact profile
contactRoutes.get("/:id", async (c) => {
  const user = c.get("user");
  const contactId = c.req.param("id");

  const contact = await db.query.networkContacts.findFirst({
    where: and(
      eq(networkContacts.id, contactId),
      eq(networkContacts.userId, user.sub),
    ),
  });

  if (!contact) {
    return c.json({ error: "Contact not found" }, 404);
  }

  const [cat, health, prefs, facts, reminders, summary] = await Promise.all([
    db.query.contactCategories.findFirst({
      where: eq(contactCategories.networkContactId, contactId),
    }),
    db.query.relationshipHealth.findFirst({
      where: eq(relationshipHealth.networkContactId, contactId),
    }),
    db.query.relationshipPreferences.findFirst({
      where: eq(relationshipPreferences.networkContactId, contactId),
    }),
    db.query.contactContext.findMany({
      where: and(
        eq(contactContext.networkContactId, contactId),
        eq(contactContext.expired, false),
      ),
    }),
    db.query.thoughtfulReminders.findMany({
      where: and(
        eq(thoughtfulReminders.networkContactId, contactId),
        eq(thoughtfulReminders.userId, user.sub),
      ),
    }),
    db.query.senderSummaries.findFirst({
      where: and(
        eq(senderSummaries.userId, user.sub),
        eq(senderSummaries.senderEmail, contact.email.toLowerCase()),
      ),
    }),
  ]);

  return c.json({
    contact,
    category: cat
      ? { category: cat.category, subcategory: cat.subcategory, manuallySet: cat.manuallySet, aiConfidence: cat.aiConfidence }
      : null,
    health: health
      ? { score: health.score, recencyScore: health.recencyScore, frequencyScore: health.frequencyScore, balanceScore: health.balanceScore, trend: health.trend }
      : null,
    preferences: prefs
      ? { desiredFrequencyDays: prefs.desiredFrequencyDays, preferredChannel: prefs.preferredChannel, notes: prefs.notes }
      : null,
    facts: facts.map((f) => ({
      id: f.id,
      fact: f.fact,
      dateRelevant: f.dateRelevant,
      sourceSubject: f.sourceSubject,
      extractedAt: f.extractedAt,
    })),
    reminders: reminders
      .filter((r) => r.status === "pending" || r.status === "snoozed")
      .map((r) => ({
        id: r.id,
        type: r.type,
        title: r.title,
        context: r.context,
        dueDate: r.dueDate,
        status: r.status,
      })),
    senderSummary: summary?.summary ?? null,
  });
});

// PUT /contacts/:id/category — Set or override category
contactRoutes.put("/:id/category", async (c) => {
  const user = c.get("user");
  const contactId = c.req.param("id");
  const { category, subcategory } = await c.req.json<{
    category: string;
    subcategory?: string;
  }>();

  // Verify ownership
  const contact = await db.query.networkContacts.findFirst({
    where: and(
      eq(networkContacts.id, contactId),
      eq(networkContacts.userId, user.sub),
    ),
  });

  if (!contact) {
    return c.json({ error: "Contact not found" }, 404);
  }

  const validCategories = ["personal", "professional", "family", "acquaintance"];
  if (!validCategories.includes(category)) {
    return c.json({ error: "Invalid category" }, 400);
  }

  await db
    .insert(contactCategories)
    .values({
      networkContactId: contactId,
      category,
      subcategory: subcategory ?? null,
      manuallySet: true,
      aiConfidence: 1.0,
    })
    .onConflictDoUpdate({
      target: contactCategories.networkContactId,
      set: {
        category,
        subcategory: subcategory ?? null,
        manuallySet: true,
        aiConfidence: 1.0,
        updatedAt: new Date(),
      },
    });

  return c.json({ ok: true });
});

// PUT /contacts/:id/preferences — Set relationship preferences
contactRoutes.put("/:id/preferences", async (c) => {
  const user = c.get("user");
  const contactId = c.req.param("id");
  const { desiredFrequencyDays, preferredChannel, notes } = await c.req.json<{
    desiredFrequencyDays?: number;
    preferredChannel?: string;
    notes?: string;
  }>();

  const contact = await db.query.networkContacts.findFirst({
    where: and(
      eq(networkContacts.id, contactId),
      eq(networkContacts.userId, user.sub),
    ),
  });

  if (!contact) {
    return c.json({ error: "Contact not found" }, 404);
  }

  await db
    .insert(relationshipPreferences)
    .values({
      networkContactId: contactId,
      desiredFrequencyDays: desiredFrequencyDays ?? null,
      preferredChannel: preferredChannel ?? null,
      notes: notes ?? null,
    })
    .onConflictDoUpdate({
      target: relationshipPreferences.networkContactId,
      set: {
        desiredFrequencyDays: desiredFrequencyDays ?? null,
        preferredChannel: preferredChannel ?? null,
        notes: notes ?? null,
      },
    });

  return c.json({ ok: true });
});

// POST /contacts/:id/facts — Add a manual fact
contactRoutes.post("/:id/facts", async (c) => {
  const user = c.get("user");
  const contactId = c.req.param("id");
  const { fact, dateRelevant } = await c.req.json<{
    fact: string;
    dateRelevant?: string;
  }>();

  if (!fact || fact.trim().length === 0) {
    return c.json({ error: "Fact is required" }, 400);
  }
  if (fact.length > 500) {
    return c.json({ error: "Fact must be under 500 characters" }, 400);
  }

  const contact = await db.query.networkContacts.findFirst({
    where: and(
      eq(networkContacts.id, contactId),
      eq(networkContacts.userId, user.sub),
    ),
  });

  if (!contact) {
    return c.json({ error: "Contact not found" }, 404);
  }

  const [inserted] = await db
    .insert(contactContext)
    .values({
      networkContactId: contactId,
      fact: fact.trim(),
      dateRelevant: dateRelevant ? new Date(dateRelevant) : null,
      sourceSubject: "Manual entry",
    })
    .returning();

  return c.json({ fact: inserted });
});

// DELETE /contacts/:id/facts/:factId — Remove a fact
contactRoutes.delete("/:id/facts/:factId", async (c) => {
  const user = c.get("user");
  const contactId = c.req.param("id");
  const factId = c.req.param("factId");

  const contact = await db.query.networkContacts.findFirst({
    where: and(
      eq(networkContacts.id, contactId),
      eq(networkContacts.userId, user.sub),
    ),
  });

  if (!contact) {
    return c.json({ error: "Contact not found" }, 404);
  }

  await db
    .delete(contactContext)
    .where(
      and(
        eq(contactContext.id, factId),
        eq(contactContext.networkContactId, contactId),
      ),
    );

  return c.json({ ok: true });
});
