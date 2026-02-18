import { eq, and, gte, lte, sql } from "drizzle-orm";
import { db } from "../db/index.js";
import {
  networkContacts,
  contactContext,
  contactCategories,
  relationshipHealth,
  relationshipPreferences,
  thoughtfulReminders,
} from "../db/schema.js";

export interface ReminderDetectionResult {
  inserted: number;
  dateReminders: number;
  checkInReminders: number;
  dinnerReminders: number;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Detect thoughtful reminders for a user's network contacts.
 * Pure SQL queries — no AI calls. Designed to run daily.
 *
 * Three detection rules:
 * 1. Date coming up — a fact has a relevant date within 14 days
 * 2. Check-in needed — health is cooling and desired frequency exceeded
 * 3. Dinner suggestion — personal contact with no contact in 90+ days
 */
export async function detectReminders(
  userId: string,
): Promise<ReminderDetectionResult> {
  let inserted = 0;
  let dateReminders = 0;
  let checkInReminders = 0;
  let dinnerReminders = 0;

  const contacts = await db.query.networkContacts.findMany({
    where: eq(networkContacts.userId, userId),
  });

  if (contacts.length === 0) {
    return { inserted: 0, dateReminders: 0, checkInReminders: 0, dinnerReminders: 0 };
  }

  // Get existing pending/snoozed reminders for dedup
  const existingReminders = await db.query.thoughtfulReminders.findMany({
    where: and(
      eq(thoughtfulReminders.userId, userId),
      sql`${thoughtfulReminders.status} IN ('pending', 'snoozed')`,
    ),
  });
  const existingSet = new Set(
    existingReminders.map((r) => `${r.networkContactId}:${r.type}:${r.dueDate ?? "none"}`),
  );

  const now = new Date();
  const fourteenDaysFromNow = new Date(now.getTime() + 14 * MS_PER_DAY);
  const ninetyDaysAgo = new Date(now.getTime() - 90 * MS_PER_DAY);

  // ── Rule 1: Date coming up ──
  // Facts with date_relevant within next 14 days
  const upcomingFacts = await db.query.contactContext.findMany({
    where: and(
      eq(contactContext.expired, false),
      gte(contactContext.dateRelevant, now),
      lte(contactContext.dateRelevant, fourteenDaysFromNow),
    ),
  });

  // Deduplicate: one reminder per contact+fact combo
  const seenContactDates = new Set<string>();
  for (const fact of upcomingFacts) {
    const contact = contacts.find((c) => c.id === fact.networkContactId);
    if (!contact) continue;

    const dateStr = fact.dateRelevant?.toISOString().split("T")[0] ?? "none";
    const dedupKey = `${fact.networkContactId}:birthday:${dateStr}`;
    if (existingSet.has(dedupKey) || seenContactDates.has(dedupKey)) continue;
    seenContactDates.add(dedupKey);

    // Determine type from fact content
    const factLower = fact.fact.toLowerCase();
    let type: string = "milestone";
    let titlePrefix = "Remember:";
    if (factLower.includes("birthday")) {
      type = "birthday";
      titlePrefix = "Buy a birthday gift for";
    } else if (factLower.includes("anniversary")) {
      type = "anniversary";
      titlePrefix = "Anniversary coming up for";
    }

    const title = type === "milestone"
      ? `${titlePrefix} ${fact.fact} — ${contact.displayName}`
      : `${titlePrefix} ${contact.displayName}`;

    const daysUntil = Math.ceil(
      ((fact.dateRelevant?.getTime() ?? 0) - now.getTime()) / MS_PER_DAY,
    );

    await db.insert(thoughtfulReminders).values({
      networkContactId: contact.id,
      userId,
      type,
      title,
      context: `${fact.fact} (in ${daysUntil} day${daysUntil === 1 ? "" : "s"})`,
      sourceFactId: fact.id,
      dueDate: dateStr,
      status: "pending",
    });

    inserted++;
    dateReminders++;
  }

  // ── Rule 2: Check-in needed ──
  // Contacts with cooling health and exceeded desired frequency
  const allHealth = await db.query.relationshipHealth.findMany();
  const healthMap = new Map(allHealth.map((h) => [h.networkContactId, h]));

  const allPrefs = await db.query.relationshipPreferences.findMany();
  const prefsMap = new Map(allPrefs.map((p) => [p.networkContactId, p]));

  for (const contact of contacts) {
    const health = healthMap.get(contact.id);
    const prefs = prefsMap.get(contact.id);

    if (!health || !contact.lastContactAt) continue;

    const daysSinceContact = (now.getTime() - contact.lastContactAt.getTime()) / MS_PER_DAY;
    const desiredFreq = prefs?.desiredFrequencyDays ?? 30;

    const shouldCheckIn =
      (health.trend === "cooling" && daysSinceContact > desiredFreq) ||
      daysSinceContact > desiredFreq * 1.5;

    if (!shouldCheckIn) continue;

    const dedupKey = `${contact.id}:check_in:none`;
    if (existingSet.has(dedupKey)) continue;

    await db.insert(thoughtfulReminders).values({
      networkContactId: contact.id,
      userId,
      type: "check_in",
      title: `Check in with ${contact.displayName}`,
      context: `Last contact was ${Math.round(daysSinceContact)} days ago. Relationship is ${health.trend}.`,
      status: "pending",
    });

    inserted++;
    checkInReminders++;
  }

  // ── Rule 3: Dinner suggestion ──
  // Personal contacts with no contact in 90+ days
  const allCategories = await db.query.contactCategories.findMany();
  const categoryMap = new Map(allCategories.map((c) => [c.networkContactId, c]));

  for (const contact of contacts) {
    const cat = categoryMap.get(contact.id);
    if (!cat || cat.category !== "personal") continue;
    if (!contact.lastContactAt) continue;

    const daysSinceContact = (now.getTime() - contact.lastContactAt.getTime()) / MS_PER_DAY;
    if (daysSinceContact < 90) continue;

    const dedupKey = `${contact.id}:dinner:none`;
    if (existingSet.has(dedupKey)) continue;

    await db.insert(thoughtfulReminders).values({
      networkContactId: contact.id,
      userId,
      type: "dinner",
      title: `Have ${contact.displayName} over for dinner`,
      context: `You haven't been in touch in ${Math.round(daysSinceContact)} days. Time to catch up in person.`,
      status: "pending",
    });

    inserted++;
    dinnerReminders++;
  }

  return { inserted, dateReminders, checkInReminders, dinnerReminders };
}
