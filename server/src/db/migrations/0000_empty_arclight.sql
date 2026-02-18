CREATE TABLE "contact_categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"network_contact_id" uuid NOT NULL,
	"category" text NOT NULL,
	"subcategory" text,
	"ai_confidence" real,
	"manually_set" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "integration_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"network_contact_id" uuid,
	"target_app" text NOT NULL,
	"action_type" text NOT NULL,
	"payload" jsonb,
	"result" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "relationship_health" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"network_contact_id" uuid NOT NULL,
	"score" real NOT NULL,
	"recency_score" real,
	"frequency_score" real,
	"balance_score" real,
	"trend" text,
	"last_computed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "relationship_preferences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"network_contact_id" uuid NOT NULL,
	"desired_frequency_days" integer,
	"preferred_channel" text,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "thoughtful_reminders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"network_contact_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"context" text,
	"source_fact_id" uuid,
	"due_date" date,
	"status" text DEFAULT 'pending' NOT NULL,
	"tessio_task_id" text,
	"snoozed_until" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "contact_categories" ADD CONSTRAINT "contact_categories_network_contact_id_network_contacts_id_fk" FOREIGN KEY ("network_contact_id") REFERENCES "public"."network_contacts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "integration_log" ADD CONSTRAINT "integration_log_network_contact_id_network_contacts_id_fk" FOREIGN KEY ("network_contact_id") REFERENCES "public"."network_contacts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "relationship_health" ADD CONSTRAINT "relationship_health_network_contact_id_network_contacts_id_fk" FOREIGN KEY ("network_contact_id") REFERENCES "public"."network_contacts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "relationship_preferences" ADD CONSTRAINT "relationship_preferences_network_contact_id_network_contacts_id_fk" FOREIGN KEY ("network_contact_id") REFERENCES "public"."network_contacts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "thoughtful_reminders" ADD CONSTRAINT "thoughtful_reminders_network_contact_id_network_contacts_id_fk" FOREIGN KEY ("network_contact_id") REFERENCES "public"."network_contacts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "thoughtful_reminders" ADD CONSTRAINT "thoughtful_reminders_source_fact_id_contact_context_id_fk" FOREIGN KEY ("source_fact_id") REFERENCES "public"."contact_context"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "idx_contact_categories_contact" ON "contact_categories" USING btree ("network_contact_id");--> statement-breakpoint
CREATE INDEX "idx_integration_log_user" ON "integration_log" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_relationship_health_contact" ON "relationship_health" USING btree ("network_contact_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_relationship_preferences_contact" ON "relationship_preferences" USING btree ("network_contact_id");--> statement-breakpoint
CREATE INDEX "idx_reminders_contact" ON "thoughtful_reminders" USING btree ("network_contact_id");--> statement-breakpoint
CREATE INDEX "idx_reminders_user_status" ON "thoughtful_reminders" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX "idx_reminders_due_date" ON "thoughtful_reminders" USING btree ("due_date");
