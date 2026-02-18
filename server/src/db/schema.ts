import {
  pgTable,
  uuid,
  text,
  timestamp,
  boolean,
  real,
  integer,
  date,
  jsonb,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";

// ═══════════════════════════════════════════════════════════════════════
// Genco's existing tables (read-only references for Drizzle queries)
// These mirror Genco's schema exactly — Apollonia reads but doesn't own them
// ═══════════════════════════════════════════════════════════════════════

export const networkContacts = pgTable(
  "network_contacts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id").notNull(),
    email: text("email").notNull(),
    displayName: text("display_name").notNull(),
    company: text("company"),
    title: text("title"),
    lastContactAt: timestamp("last_contact_at", { withTimezone: true }),
    lastDirection: text("last_direction"),
    threadStatus: text("thread_status"),
    gmailThreadId: text("gmail_thread_id"),
    lastSubject: text("last_subject"),
    phoneNumber: text("phone_number"),
    addedAt: timestamp("added_at", { withTimezone: true }).notNull().defaultNow(),
    notes: text("notes"),
  },
  (table) => [
    uniqueIndex("idx_network_contacts_user_email").on(table.userId, table.email),
    index("idx_network_contacts_user").on(table.userId),
    index("idx_network_contacts_thread_status").on(table.userId, table.threadStatus),
  ],
);

export const contactContext = pgTable(
  "contact_context",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    networkContactId: uuid("network_contact_id")
      .notNull()
      .references(() => networkContacts.id, { onDelete: "cascade" }),
    fact: text("fact").notNull(),
    dateRelevant: timestamp("date_relevant", { withTimezone: true }),
    sourceSubject: text("source_subject"),
    extractedAt: timestamp("extracted_at", { withTimezone: true }).notNull().defaultNow(),
    expired: boolean("expired").notNull().default(false),
  },
  (table) => [
    index("idx_contact_context_contact").on(table.networkContactId),
    index("idx_contact_context_date").on(table.dateRelevant),
  ],
);

export const senderSummaries = pgTable(
  "sender_summaries",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id").notNull(),
    senderEmail: text("sender_email").notNull(),
    senderName: text("sender_name"),
    summary: text("summary").notNull(),
    emailCount: text("email_count").notNull().default("1"),
    lastAction: text("last_action"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("idx_sender_summaries_user_email").on(table.userId, table.senderEmail),
    index("idx_sender_summaries_user").on(table.userId),
  ],
);

export const gmailConnections = pgTable(
  "gmail_connections",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id").notNull(),
    gmailAddress: text("gmail_address").notNull(),
    googleTokens: jsonb("google_tokens").notNull(),
    lastHistoryId: text("last_history_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("idx_gmail_connections_user").on(table.userId),
    index("idx_gmail_connections_email").on(table.gmailAddress),
  ],
);

export const followUpQueue = pgTable(
  "follow_up_queue",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    networkContactId: uuid("network_contact_id")
      .notNull()
      .references(() => networkContacts.id, { onDelete: "cascade" }),
    reason: text("reason").notNull(),
    surfacedAt: timestamp("surfaced_at", { withTimezone: true }).notNull().defaultNow(),
    status: text("status").notNull().default("pending"),
    snoozedUntil: timestamp("snoozed_until", { withTimezone: true }),
    suggestedAction: text("suggested_action"),
    aiDraft: text("ai_draft"),
    contextSnapshot: text("context_snapshot"),
  },
  (table) => [
    index("idx_follow_up_queue_contact").on(table.networkContactId),
    index("idx_follow_up_queue_status").on(table.status),
  ],
);

// ═══════════════════════════════════════════════════════════════════════
// Apollonia's own tables
// ═══════════════════════════════════════════════════════════════════════

export const contactCategories = pgTable(
  "contact_categories",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    networkContactId: uuid("network_contact_id")
      .notNull()
      .references(() => networkContacts.id, { onDelete: "cascade" }),
    category: text("category").notNull(),
    subcategory: text("subcategory"),
    aiConfidence: real("ai_confidence"),
    manuallySet: boolean("manually_set").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("idx_contact_categories_contact").on(table.networkContactId),
  ],
);

export const relationshipHealth = pgTable(
  "relationship_health",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    networkContactId: uuid("network_contact_id")
      .notNull()
      .references(() => networkContacts.id, { onDelete: "cascade" }),
    score: real("score").notNull(),
    recencyScore: real("recency_score"),
    frequencyScore: real("frequency_score"),
    balanceScore: real("balance_score"),
    trend: text("trend"),
    lastComputedAt: timestamp("last_computed_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("idx_relationship_health_contact").on(table.networkContactId),
  ],
);

export const relationshipPreferences = pgTable(
  "relationship_preferences",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    networkContactId: uuid("network_contact_id")
      .notNull()
      .references(() => networkContacts.id, { onDelete: "cascade" }),
    desiredFrequencyDays: integer("desired_frequency_days"),
    preferredChannel: text("preferred_channel"),
    notes: text("notes"),
  },
  (table) => [
    uniqueIndex("idx_relationship_preferences_contact").on(table.networkContactId),
  ],
);

export const thoughtfulReminders = pgTable(
  "thoughtful_reminders",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    networkContactId: uuid("network_contact_id")
      .notNull()
      .references(() => networkContacts.id, { onDelete: "cascade" }),
    userId: text("user_id").notNull(),
    type: text("type").notNull(),
    title: text("title").notNull(),
    context: text("context"),
    sourceFactId: uuid("source_fact_id").references(() => contactContext.id),
    dueDate: date("due_date"),
    status: text("status").notNull().default("pending"),
    tessioTaskId: text("tessio_task_id"),
    snoozedUntil: date("snoozed_until"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_reminders_contact").on(table.networkContactId),
    index("idx_reminders_user_status").on(table.userId, table.status),
    index("idx_reminders_due_date").on(table.dueDate),
  ],
);

export const integrationLog = pgTable(
  "integration_log",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id").notNull(),
    networkContactId: uuid("network_contact_id").references(() => networkContacts.id),
    targetApp: text("target_app").notNull(),
    actionType: text("action_type").notNull(),
    payload: jsonb("payload"),
    result: jsonb("result"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_integration_log_user").on(table.userId),
  ],
);
