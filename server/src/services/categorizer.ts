import { eq, isNull } from "drizzle-orm";
import { db } from "../db/index.js";
import {
  networkContacts,
  contactContext,
  senderSummaries,
  contactCategories,
} from "../db/schema.js";
import { categorizeContact } from "../lib/claude.js";

/**
 * Categorize a single contact using Claude AI.
 * Writes result to contact_categories table.
 */
export async function categorizeOne(contactId: string): Promise<void> {
  const contact = await db.query.networkContacts.findFirst({
    where: eq(networkContacts.id, contactId),
  });

  if (!contact) return;

  const summary = await db.query.senderSummaries.findFirst({
    where: eq(senderSummaries.senderEmail, contact.email.toLowerCase()),
  });

  const facts = await db.query.contactContext.findMany({
    where: eq(contactContext.networkContactId, contactId),
  });

  const result = await categorizeContact({
    email: contact.email,
    displayName: contact.displayName,
    company: contact.company,
    title: contact.title,
    senderSummary: summary?.summary ?? null,
    facts: facts.filter((f) => !f.expired).map((f) => f.fact),
  });

  await db
    .insert(contactCategories)
    .values({
      networkContactId: contactId,
      category: result.category,
      subcategory: result.subcategory,
      aiConfidence: result.confidence,
      manuallySet: false,
    })
    .onConflictDoUpdate({
      target: contactCategories.networkContactId,
      set: {
        category: result.category,
        subcategory: result.subcategory,
        aiConfidence: result.confidence,
        updatedAt: new Date(),
      },
    });
}

/**
 * Categorize all contacts that don't have a category yet.
 * Returns count of contacts categorized.
 */
export async function categorizeAllUncategorized(userId: string): Promise<number> {
  // Find contacts without a category row
  const rows = await db
    .select({ id: networkContacts.id, catId: contactCategories.id })
    .from(networkContacts)
    .leftJoin(
      contactCategories,
      eq(networkContacts.id, contactCategories.networkContactId),
    )
    .where(eq(networkContacts.userId, userId));

  const contacts = rows.filter((r) => r.catId === null);

  let categorized = 0;
  for (const row of contacts) {
    try {
      await categorizeOne(row.id);
      categorized++;
    } catch (err) {
      console.error(`Failed to categorize contact ${row.id}:`, err);
    }
  }

  return categorized;
}
