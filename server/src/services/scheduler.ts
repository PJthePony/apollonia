import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { networkContacts } from "../db/schema.js";
import { recomputeAll } from "./health.js";
import { detectReminders } from "./reminders.js";
import { categorizeAllUncategorized } from "./categorizer.js";

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Run the daily maintenance cycle for a user:
 * 1. Recompute health scores
 * 2. Detect new reminders
 * 3. Categorize any new uncategorized contacts
 */
async function runDailyCycle(): Promise<void> {
  console.log("[scheduler] Starting daily cycle...");

  try {
    // Get distinct user IDs from network_contacts
    const rows = await db
      .selectDistinct({ userId: networkContacts.userId })
      .from(networkContacts);

    for (const { userId } of rows) {
      console.log(`[scheduler] Processing user ${userId}`);

      const healthCount = await recomputeAll(userId);
      console.log(`[scheduler]   Health scores updated: ${healthCount}`);

      const reminders = await detectReminders(userId);
      console.log(
        `[scheduler]   Reminders detected: ${reminders.inserted}` +
          ` (date: ${reminders.dateReminders}, check-in: ${reminders.checkInReminders}, dinner: ${reminders.dinnerReminders})`,
      );

      const categorized = await categorizeAllUncategorized(userId);
      if (categorized > 0) {
        console.log(`[scheduler]   Contacts categorized: ${categorized}`);
      }
    }

    console.log("[scheduler] Daily cycle complete.");
  } catch (err) {
    console.error("[scheduler] Error in daily cycle:", err);
  }
}

export function startScheduler(): void {
  // Run once on startup (after a short delay to let DB connect)
  setTimeout(runDailyCycle, 5000);

  // Then run daily
  setInterval(runDailyCycle, ONE_DAY_MS);

  console.log("[scheduler] Scheduler started (runs daily)");
}
