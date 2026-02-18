import { Hono } from "hono";
import { google } from "googleapis";
import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { gmailConnections, networkContacts } from "../db/schema.js";
import { authMiddleware, type AuthUser } from "../middleware/auth.js";
import { env } from "../config.js";
import { categorizeAllUncategorized } from "../services/categorizer.js";
import { recomputeAll } from "../services/health.js";

export const importRoutes = new Hono<{ Variables: { user: AuthUser } }>();

importRoutes.use("/*", authMiddleware);

/**
 * POST /import/google-contacts
 * Pulls full Google Contacts via People API and upserts into network_contacts.
 */
importRoutes.post("/google-contacts", async (c) => {
  const user = c.get("user");

  // 1. Get stored Google tokens from gmail_connections (shared with Genco)
  const connection = await db.query.gmailConnections.findFirst({
    where: eq(gmailConnections.userId, user.sub),
  });

  if (!connection) {
    return c.json(
      { error: "No Google account connected. Connect Gmail in Genco first." },
      400,
    );
  }

  const tokens = connection.googleTokens as {
    access_token?: string | null;
    refresh_token?: string | null;
    expiry_date?: number | null;
    token_type?: string | null;
    scope?: string | null;
  };

  // Check if contacts scope is available
  if (tokens.scope && !tokens.scope.includes("contacts.readonly")) {
    return c.json(
      {
        error:
          "Google Contacts permission not granted. Re-authorize Gmail in Genco settings to grant contacts access.",
      },
      403,
    );
  }

  // 2. Create Google OAuth2 client with stored tokens
  const oauth2Client = new google.auth.OAuth2(
    env.GOOGLE_CLIENT_ID,
    env.GOOGLE_CLIENT_SECRET,
  );
  oauth2Client.setCredentials({
    access_token: tokens.access_token ?? undefined,
    refresh_token: tokens.refresh_token ?? undefined,
    expiry_date: tokens.expiry_date ?? undefined,
    token_type: tokens.token_type ?? undefined,
  });

  const people = google.people({ version: "v1", auth: oauth2Client });

  // 3. Page through all contacts
  let imported = 0;
  let skipped = 0;
  let total = 0;
  let nextPageToken: string | undefined;

  try {
    do {
      const res = await people.people.connections.list({
        resourceName: "people/me",
        pageSize: 1000,
        personFields: "names,emailAddresses,organizations,phoneNumbers",
        pageToken: nextPageToken,
      });

      const connections = res.data.connections ?? [];
      total += connections.length;

      for (const person of connections) {
        const emails = person.emailAddresses ?? [];
        const names = person.names ?? [];
        const orgs = person.organizations ?? [];
        const phones = person.phoneNumbers ?? [];

        // Skip contacts without an email
        if (emails.length === 0) {
          skipped++;
          continue;
        }

        const email = emails[0].value?.toLowerCase();
        if (!email) {
          skipped++;
          continue;
        }

        const displayName =
          names[0]?.displayName ?? email.split("@")[0] ?? email;
        const company = orgs[0]?.name ?? null;
        const title = orgs[0]?.title ?? null;
        const phoneNumber = phones[0]?.value ?? null;

        // 4. Upsert — onConflictDoNothing matches Genco's pattern
        const [result] = await db
          .insert(networkContacts)
          .values({
            userId: user.sub,
            email,
            displayName,
            company,
            title,
            phoneNumber,
          })
          .onConflictDoNothing()
          .returning();

        if (result) {
          imported++;
        } else {
          skipped++;
        }
      }

      nextPageToken = res.data.nextPageToken ?? undefined;
    } while (nextPageToken);
  } catch (err: any) {
    console.error("[import] Google People API error:", err.message);
    return c.json(
      {
        error: "Failed to fetch Google Contacts. You may need to re-authorize Gmail in Genco settings.",
        detail: err.message,
        imported,
        skipped,
        total,
      },
      500,
    );
  }

  // 5. Trigger categorization + health recompute for new contacts
  try {
    const categorized = await categorizeAllUncategorized(user.sub);
    await recomputeAll(user.sub);
    console.log(
      `[import] Done: ${imported} imported, ${skipped} skipped, ${categorized} categorized`,
    );
  } catch (err) {
    console.error("[import] Post-import processing error:", err);
    // Don't fail the response — contacts were imported successfully
  }

  return c.json({ ok: true, imported, skipped, total });
});
