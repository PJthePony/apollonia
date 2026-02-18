import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import {
  networkContacts,
  senderSummaries,
  relationshipHealth,
} from "../db/schema.js";

/**
 * Compute the relationship health score for a single contact.
 * Pure computation — no AI calls.
 *
 * Components:
 *   Recency  (40%) — exponential decay from last_contact_at
 *   Frequency (30%) — emails per month, normalized
 *   Balance  (30%) — direction balance (sent vs received)
 */

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function recencyScore(lastContactAt: Date | null): number {
  if (!lastContactAt) return 0;
  const daysSince = (Date.now() - lastContactAt.getTime()) / MS_PER_DAY;
  // Exponential decay: half-life of 14 days
  return Math.exp(-0.693 * (daysSince / 14));
}

function frequencyScore(emailCount: number, firstContactDaysAgo: number): number {
  if (firstContactDaysAgo <= 0) return 0;
  const monthsActive = Math.max(firstContactDaysAgo / 30, 1);
  const perMonth = emailCount / monthsActive;
  // Normalize: 4+ emails/month = 1.0, linear below that
  return Math.min(perMonth / 4, 1.0);
}

function balanceScore(lastDirection: string | null): number {
  // With only lastDirection available (not full counts), approximate:
  // "sent" = you reached out last (good balance signal) → 0.7
  // "received" = they reached out, you haven't replied → 0.4
  // unknown → neutral 0.5
  if (lastDirection === "sent") return 0.7;
  if (lastDirection === "received") return 0.4;
  return 0.5;
}

function determineTrend(
  currentScore: number,
  previousScore: number | null,
): "warming" | "stable" | "cooling" {
  if (previousScore === null) return "stable";
  const diff = currentScore - previousScore;
  if (diff > 0.05) return "warming";
  if (diff < -0.05) return "cooling";
  return "stable";
}

interface ContactForHealth {
  id: string;
  lastContactAt: Date | null;
  lastDirection: string | null;
  addedAt: Date;
}

interface SenderSummaryForHealth {
  emailCount: string;
}

export function computeScore(
  contact: ContactForHealth,
  summary: SenderSummaryForHealth | null,
): { score: number; recencyScore: number; frequencyScore: number; balanceScore: number } {
  const r = recencyScore(contact.lastContactAt);
  const daysActive = (Date.now() - contact.addedAt.getTime()) / MS_PER_DAY;
  const emailCount = summary ? parseInt(summary.emailCount, 10) || 1 : 1;
  const f = frequencyScore(emailCount, daysActive);
  const b = balanceScore(contact.lastDirection);

  const composite = r * 0.4 + f * 0.3 + b * 0.3;

  return {
    score: Math.round(composite * 100) / 100,
    recencyScore: Math.round(r * 100) / 100,
    frequencyScore: Math.round(f * 100) / 100,
    balanceScore: Math.round(b * 100) / 100,
  };
}

export async function recomputeAll(userId: string): Promise<number> {
  const contacts = await db.query.networkContacts.findMany({
    where: eq(networkContacts.userId, userId),
  });

  if (contacts.length === 0) return 0;

  const summaries = await db.query.senderSummaries.findMany({
    where: eq(senderSummaries.userId, userId),
  });
  const summaryMap = new Map(summaries.map((s) => [s.senderEmail.toLowerCase(), s]));

  // Get existing health rows to determine trend
  const existingHealth = await db.query.relationshipHealth.findMany();
  const healthMap = new Map(existingHealth.map((h) => [h.networkContactId, h]));

  let updated = 0;

  for (const contact of contacts) {
    const summary = summaryMap.get(contact.email.toLowerCase()) ?? null;
    const scores = computeScore(contact, summary);
    const existing = healthMap.get(contact.id);
    const trend = determineTrend(scores.score, existing?.score ?? null);

    await db
      .insert(relationshipHealth)
      .values({
        networkContactId: contact.id,
        score: scores.score,
        recencyScore: scores.recencyScore,
        frequencyScore: scores.frequencyScore,
        balanceScore: scores.balanceScore,
        trend,
        lastComputedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: relationshipHealth.networkContactId,
        set: {
          score: scores.score,
          recencyScore: scores.recencyScore,
          frequencyScore: scores.frequencyScore,
          balanceScore: scores.balanceScore,
          trend,
          lastComputedAt: new Date(),
        },
      });

    updated++;
  }

  return updated;
}
