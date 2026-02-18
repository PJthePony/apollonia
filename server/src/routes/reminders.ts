import { Hono } from "hono";
import { eq, and, sql } from "drizzle-orm";
import { db } from "../db/index.js";
import {
  networkContacts,
  thoughtfulReminders,
  integrationLog,
} from "../db/schema.js";
import { authMiddleware, type AuthUser } from "../middleware/auth.js";
import { createTessioTask } from "../lib/tessio.js";

export const reminderRoutes = new Hono<{ Variables: { user: AuthUser } }>();

reminderRoutes.use("*", authMiddleware);

// GET /reminders — List pending + due-snoozed reminders
reminderRoutes.get("/", async (c) => {
  const user = c.get("user");

  const reminders = await db.query.thoughtfulReminders.findMany({
    where: and(
      eq(thoughtfulReminders.userId, user.sub),
      sql`(${thoughtfulReminders.status} = 'pending' OR (${thoughtfulReminders.status} = 'snoozed' AND ${thoughtfulReminders.snoozedUntil} <= CURRENT_DATE))`,
    ),
  });

  // Enrich with contact info
  const contactIds = [...new Set(reminders.map((r) => r.networkContactId))];
  const contacts = contactIds.length > 0
    ? await db.query.networkContacts.findMany({
        where: sql`${networkContacts.id} IN (${sql.join(contactIds.map((id) => sql`${id}`), sql`, `)})`,
      })
    : [];
  const contactMap = new Map(contacts.map((c) => [c.id, c]));

  const enriched = reminders.map((r) => {
    const contact = contactMap.get(r.networkContactId);
    return {
      id: r.id,
      type: r.type,
      title: r.title,
      context: r.context,
      dueDate: r.dueDate,
      status: r.status,
      createdAt: r.createdAt,
      contact: contact
        ? {
            id: contact.id,
            displayName: contact.displayName,
            email: contact.email,
            company: contact.company,
          }
        : null,
    };
  });

  // Sort: due soonest first, then by created date
  enriched.sort((a, b) => {
    if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate);
    if (a.dueDate) return -1;
    if (b.dueDate) return 1;
    return 0;
  });

  return c.json({ reminders: enriched });
});

// POST /reminders/:id/send-to-tessio — Create task in Tessio
reminderRoutes.post("/:id/send-to-tessio", async (c) => {
  const user = c.get("user");
  const reminderId = c.req.param("id");

  const reminder = await db.query.thoughtfulReminders.findFirst({
    where: and(
      eq(thoughtfulReminders.id, reminderId),
      eq(thoughtfulReminders.userId, user.sub),
    ),
  });

  if (!reminder) {
    return c.json({ error: "Reminder not found" }, 404);
  }

  if (reminder.status === "sent_to_tessio") {
    return c.json({ error: "Already sent to Tessio" }, 400);
  }

  // Get contact info for the task notes
  const contact = await db.query.networkContacts.findFirst({
    where: eq(networkContacts.id, reminder.networkContactId),
  });

  const notes = [
    contact ? `Contact: ${contact.displayName} <${contact.email}>` : "",
    contact?.company ? `Company: ${contact.company}` : "",
    reminder.context ?? "",
  ]
    .filter(Boolean)
    .join("\n");

  const result = await createTessioTask(user.sub, reminder.title, {
    notes,
    dueDate: reminder.dueDate ?? undefined,
    reminderType: reminder.type,
  });

  // Update reminder status
  await db
    .update(thoughtfulReminders)
    .set({ status: "sent_to_tessio", tessioTaskId: result.id })
    .where(eq(thoughtfulReminders.id, reminderId));

  // Log the integration action
  await db.insert(integrationLog).values({
    userId: user.sub,
    networkContactId: reminder.networkContactId,
    targetApp: "tessio",
    actionType: "create_task",
    payload: { reminderId, title: reminder.title, taskLocation: result.location ?? "unknown" },
    result: { taskId: result.id },
  });

  return c.json({ ok: true, taskId: result.id });
});

// POST /reminders/:id/dismiss — Dismiss a reminder
reminderRoutes.post("/:id/dismiss", async (c) => {
  const user = c.get("user");
  const reminderId = c.req.param("id");

  await db
    .update(thoughtfulReminders)
    .set({ status: "dismissed" })
    .where(
      and(
        eq(thoughtfulReminders.id, reminderId),
        eq(thoughtfulReminders.userId, user.sub),
      ),
    );

  return c.json({ ok: true });
});

// POST /reminders/:id/snooze — Snooze a reminder
reminderRoutes.post("/:id/snooze", async (c) => {
  const user = c.get("user");
  const reminderId = c.req.param("id");
  const { until } = await c.req.json<{ until: string }>();

  if (!until) {
    return c.json({ error: "Snooze date is required" }, 400);
  }

  await db
    .update(thoughtfulReminders)
    .set({ status: "snoozed", snoozedUntil: until })
    .where(
      and(
        eq(thoughtfulReminders.id, reminderId),
        eq(thoughtfulReminders.userId, user.sub),
      ),
    );

  return c.json({ ok: true });
});
