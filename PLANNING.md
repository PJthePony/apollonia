# Apollonia — Complete Technical Plan

**Version:** 1.0
**Date:** 2026-04-12
**Author:** Claude (Architect)
**Status:** Draft — awaiting P.J.'s review

---

## Table of Contents

1. [Existing Repo Inventory](#1-existing-repo-inventory)
2. [Data Migration Plan](#2-data-migration-plan)
3. [Architecture Document](#3-architecture-document)
4. [Full Supabase Schema](#4-full-supabase-schema)
5. [API Route Specifications](#5-api-route-specifications)
6. [AI Prompt Library](#6-ai-prompt-library)
7. [MCP Server Implementation Spec](#7-mcp-server-implementation-spec)
8. [Claude Skill Definition](#8-claude-skill-definition)
9. [Data Pipeline Pseudocode](#9-data-pipeline-pseudocode)
10. [Phased Sprint Plan](#10-phased-sprint-plan)
11. [Open Questions](#11-open-questions)

---

## 1. Existing Repo Inventory

### What Exists Today

The current Apollonia app is a **Vue 3 + Vite** SPA with a **Hono.js** backend server. It is NOT a Next.js app.

#### Routes & Pages
| Route | View | Description |
|-------|------|-------------|
| `/` | LandingView | Public landing page with sign-in button |
| `/login` | LoginView | Email-based magic link auth (Supabase OTP) |
| `/dashboard` | DashboardView | Main hub: stats, contact list, reminders, import |
| `/contacts/:id` | ContactView | Full contact profile with category, health, preferences, facts |

#### Database Schema (Drizzle ORM on Railway PostgreSQL)

**Apollonia-owned tables:**
- `contact_categories` — Contact categorization (personal/professional/family/acquaintance)
- `relationship_health` — Health scores (recency/frequency/balance components)
- `relationship_preferences` — Desired contact frequency and channel preferences
- `thoughtful_reminders` — Generated reminders (birthdays, anniversaries, check-ins, dinner suggestions)
- `integration_log` — Audit log of Tessio integrations

**Shared with Genco (read references):**
- `network_contacts` — Contacts imported from email/Google Contacts
- `contact_context` — Facts extracted from emails
- `sender_summaries` — Email summaries from Genco
- `gmail_connections` — OAuth tokens
- `follow_up_queue` — Follow-up suggestions

#### Integrations Started
| Integration | Status | Notes |
|-------------|--------|-------|
| Gmail (Google People API) | Working | OAuth2 contact import |
| Claude AI | Working | Contact categorization via tool calling (Sonnet 4.5) |
| Tessio | Working | Sends reminders as tasks via HTTP API |
| Supabase Auth | Working | Magic link + Luca cross-domain session sync |
| Granola | Not started | Referenced but no code |
| LinkedIn | Not started | No code |
| iMessage | Not started | No code |

#### UI Components
- `AppHeader.vue` — Top navigation (unified style with Genco/Tessio)
- `ContactCard.vue` — Contact overview card with avatar, category, health
- `CategoryBadge.vue` — Colored category pills
- `RelationshipHealth.vue` — Health score indicator with trend
- `ReminderCard.vue` — Reminder card with Tessio/dismiss/snooze actions

#### Design System
- IBM Plex Sans typography
- Slate + orange color palette (identical tokens to Genco and Tessio)
- CSS variables for all design tokens (no Tailwind, no shadcn/ui)
- Mobile-first responsive (640px breakpoint)

#### Backend (Hono.js on Railway)
- Full REST API for contacts, reminders, relationships, dashboard, import
- Daily scheduler: health recompute → reminder detection → auto-categorization
- Drizzle ORM for database access
- JWT auth via jose

### What's Worth Salvaging

| Item | Verdict | Reason |
|------|---------|--------|
| Health scoring algorithm | **Salvage** | Pure math (recency/frequency/balance), well-designed exponential decay |
| Claude categorization prompts | **Salvage** | Tool-calling approach with structured output is solid |
| Tessio integration pattern | **Salvage** | Clean HTTP API integration, intelligent date scheduling |
| Design tokens (colors, typography, spacing) | **Salvage** | Must match family design language |
| Vue components | **Discard** | Rewriting to Next.js/React |
| Drizzle ORM schemas | **Discard** | Moving to Supabase with new schema |
| Hono.js backend | **Discard** | Moving to Next.js API routes |
| Router/auth setup | **Discard** | Different framework |

---

## 2. Data Migration Plan

### Current Data Assessment

The existing app uses a Railway PostgreSQL database shared with Genco. Apollonia's tables contain:

1. **network_contacts** — Imported from Google Contacts. These are the seed contacts.
2. **contact_context** — AI-extracted facts from email analysis (Genco). High value.
3. **contact_categories** — Manual and AI-generated categorizations.
4. **relationship_health** — Computed health scores (will be recomputed anyway).
5. **relationship_preferences** — User-set contact frequency preferences.
6. **thoughtful_reminders** — Generated reminders (ephemeral, not worth migrating).
7. **integration_log** — Audit trail (not worth migrating).

### Migration Strategy

#### Step 1: Export

```bash
# Export contacts with their categories and preferences
psql $DATABASE_URL -c "
  SELECT nc.*, cc.category, cc.subcategory, cc.confidence,
         rp.desired_frequency_days, rp.preferred_channels
  FROM network_contacts nc
  LEFT JOIN contact_categories cc ON nc.id = cc.contact_id
  LEFT JOIN relationship_preferences rp ON rp.contact_id = nc.id
  WHERE nc.user_id = '<owner_user_id>'
" --csv > contacts_export.csv

# Export contact facts
psql $DATABASE_URL -c "
  SELECT cf.contact_id, cf.fact_type, cf.fact_content, cf.confidence, cf.extracted_at
  FROM contact_context cf
  JOIN network_contacts nc ON nc.id = cf.contact_id
  WHERE nc.user_id = '<owner_user_id>'
" --csv > facts_export.csv
```

#### Step 2: Transform

Write a migration script (`scripts/migrate-data.ts`) that:
1. Reads exported CSVs
2. Maps old `network_contacts` fields to new `contacts` schema
3. Maps `contact_categories` to `relationship_type` enum (professional → peer/advisor/operator, personal → other, family → other)
4. Maps `relationship_preferences.desired_frequency_days` to `target_contact_interval_days`
5. Maps `contact_context` facts to `contacts.standout_details` JSONB array
6. Sets `relationship_tier` based on category confidence + whether preferences were set (has preferences → "active", high-confidence professional → "active", everything else → "dormant")

#### Step 3: Import into new Supabase schema

```bash
# Run the migration script against the new Supabase instance
npx tsx scripts/migrate-data.ts --input ./exports/ --supabase-url $NEXT_PUBLIC_SUPABASE_URL --service-key $SUPABASE_SERVICE_ROLE_KEY
```

#### Step 4: Generate initial relationship summaries

After import, run a batch job that:
1. For each imported contact with facts, call Claude to generate an initial `relationship_summary`
2. Generate embeddings for each summary
3. Compute initial health scores

**Note:** The shared Railway database (Genco's tables) stays untouched. Genco continues to operate independently. The new Apollonia on Supabase is a clean break.

---

## 3. Architecture Document

### Framework Decision: Vue 3 vs. Next.js

**The spec calls for Next.js 14. However, all three sibling apps (Tessio, Genco, current Apollonia) are Vue 3 + Vite.** This is the single biggest architectural decision.

**Recommendation: Build in Vue 3 + Vite, not Next.js.** Here's why:

1. **Family consistency** — All three existing apps share composables, design tokens, auth patterns, and deployment conventions. A Next.js app would be the odd one out.
2. **Auth pattern** — The cross-domain Luca session sync is already built for Vue/Supabase. Porting to Next.js middleware adds complexity.
3. **Component reuse** — Header, auth flow, design tokens can be shared directly.
4. **Supabase client-side SDK** — Works identically in Vue and React. No advantage to Next.js here.
5. **API routes** — The existing pattern uses a separate Hono.js backend. For the new app, we can use Supabase Edge Functions for server-side AI calls (or keep a thin API server on Railway). Next.js API routes are convenient but not a decisive advantage.
6. **MCP server** — Lives as a separate Express/Node service regardless of frontend framework.
7. **No SSR needed** — This is a single-user personal tool behind auth. No SEO, no public pages that benefit from SSR.

**If P.J. insists on Next.js:** The plan works either way. The schema, AI layer, MCP server, and data pipelines are framework-agnostic. Only the frontend components and routing change. But the recommendation is Vue 3 for coherence with the family.

**Decision for this plan: Proceed with Vue 3 + Vite + Tailwind CSS.** The Tailwind + shadcn/ui part of the spec is achievable in Vue via `shadcn-vue` (the official Vue port). This gives us Tailwind's utility classes plus shadcn's component library while staying in the Vue ecosystem.

### Tech Stack (Finalized)

| Layer | Choice | Rationale |
|-------|--------|-----------|
| Frontend | Vue 3 + Vite + Tailwind CSS + shadcn-vue | Family consistency |
| Backend API | Supabase Edge Functions (Deno) for AI calls; Supabase client SDK for CRUD | Eliminates separate backend server |
| Database | Supabase (Postgres + Auth + RLS + pgvector) | As specified |
| AI | Anthropic SDK (Claude Sonnet 4) | As specified |
| MCP Server | Express/Node on Railway, SSE transport | As specified |
| Hosting | Vercel (frontend SPA) + Supabase (backend) + Railway (MCP) | As specified |
| Auth | Supabase magic link + Luca session sync | Existing family pattern |

### Key Architectural Decisions

1. **Single-user, client-heavy architecture.** Supabase RLS scopes everything to `owner_id = auth.uid()`. No multi-tenant concerns.

2. **AI calls are server-side only.** All Claude API calls go through Supabase Edge Functions. The Anthropic API key never reaches the client.

3. **MCP server is the primary write interface for Claude-mediated intake.** The web UI and MCP server share the same Supabase database via service role key.

4. **Relationship summaries are the primary read surface.** Briefings read summaries, not interaction logs. Summaries are rewritten after every interaction.

5. **Health scores are pre-computed nightly** and stored on the contact record.

6. **Embeddings are generated as a background job** after summary rewrites, not inline.

7. **Raw imported content is encrypted at rest** using Supabase Vault (or pgcrypto). Only summaries and notes are plaintext.

8. **No separate backend server for CRUD.** Supabase client SDK handles all reads/writes directly from the frontend with RLS enforcement. Edge Functions handle AI-only operations.

### System Architecture

```
┌─────────────────────────────────────────────────────┐
│                     Frontend (Vue 3 + Vite)          │
│                     Hosted on Vercel                 │
│   ┌──────────┐  ┌──────────┐  ┌──────────────────┐  │
│   │ Dashboard │  │ Contacts │  │ Import / Settings│  │
│   └─────┬────┘  └────┬─────┘  └────────┬─────────┘  │
│         └────────────┬┘                 │            │
│                      ▼                  │            │
│            Supabase Client SDK          │            │
│         (reads/writes with RLS)         │            │
└──────────────────────┬──────────────────┘            │
                       │                               │
                       ▼                               │
┌──────────────────────────────────────────────────────┐
│                    Supabase                           │
│  ┌──────────┐  ┌──────────┐  ┌────────────────────┐  │
│  │ Postgres  │  │   Auth   │  │  Edge Functions    │  │
│  │ + pgvec   │  │  (OTP)   │  │  (AI endpoints)    │  │
│  │ + pgcryp  │  │          │  │  - brief           │  │
│  │ + RLS     │  │          │  │  - draft            │  │
│  └──────────┘  └──────────┘  │  - rewrite_summary  │  │
│                              │  - health_cron       │  │
│                              │  - extract_context   │  │
│                              └────────────────────┘  │
└──────────────────────────────────────────────────────┘
                       ▲
                       │
┌──────────────────────┴───────────────────────────────┐
│              MCP Server (Express on Railway)          │
│  ┌─────────────────┐  ┌─────────────────────────┐    │
│  │  Write Tools     │  │  Read Tools              │    │
│  │  log_interaction │  │  get_contact             │    │
│  │  update_contact  │  │  get_summary             │    │
│  │  add_contact     │  │  list_contacts           │    │
│  │  log_intro       │  │  get_brief               │    │
│  └─────────────────┘  │  get_due_outreach         │    │
│                       │  search_contacts           │    │
│                       └─────────────────────────┘    │
│  Authenticates with Supabase service role key        │
│  Exposes SSE transport for Claude.ai                 │
└──────────────────────────────────────────────────────┘
```

---

## 4. Full Supabase Schema

### Extensions

```sql
-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "pgvector" WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS "pg_trgm" WITH SCHEMA extensions;  -- for fuzzy text search
```

### Enums

```sql
CREATE TYPE relationship_type AS ENUM (
  'mentor', 'mentee', 'peer', 'vc', 'founder', 'advisor', 'operator', 'other'
);

CREATE TYPE relationship_tier AS ENUM (
  'core', 'active', 'dormant', 'archived'
);

CREATE TYPE interaction_type AS ENUM (
  'email', 'text', 'linkedin_message', 'meeting', 'coffee', 'call',
  'event', 'intro_made', 'intro_received', 'social_media_comment'
);

CREATE TYPE interaction_source AS ENUM (
  'manual', 'gmail_import', 'imessage_import', 'linkedin_import', 'granola_import', 'mcp_intake'
);

CREATE TYPE sentiment AS ENUM ('positive', 'neutral', 'negative');

CREATE TYPE note_type AS ENUM ('general', 'prep', 'follow_up', 'meeting_summary');

CREATE TYPE recommendation_status AS ENUM ('pending', 'sent', 'dismissed');

CREATE TYPE seed_source AS ENUM ('linkedin_csv', 'gmail_contacts', 'manual');

CREATE TYPE seed_status AS ENUM ('pending', 'imported', 'failed', 'skipped');
```

### Tables

```sql
-- ============================================================
-- CONTACTS
-- ============================================================
CREATE TABLE contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Identity
  name TEXT NOT NULL,
  emails TEXT[] DEFAULT '{}',
  phones TEXT[] DEFAULT '{}',
  linkedin_url TEXT,
  company TEXT,
  title TEXT,
  location TEXT,

  -- Relationship metadata
  how_met TEXT,
  introduced_by UUID REFERENCES contacts(id) ON DELETE SET NULL,
  date_met DATE,
  relationship_type relationship_type DEFAULT 'other',
  relationship_tier relationship_tier DEFAULT 'dormant',

  -- Cadence
  target_contact_interval_days INTEGER DEFAULT 30,
  last_contacted_at TIMESTAMPTZ,
  next_contact_due_at TIMESTAMPTZ,
  health_score INTEGER DEFAULT 50 CHECK (health_score >= 0 AND health_score <= 100),

  -- Profile enrichment
  bio_notes TEXT,
  standout_details JSONB DEFAULT '[]',  -- [{detail, captured_at}]
  linkedin_headline_snapshot TEXT,

  -- Personal details (structured)
  birthday_month INTEGER CHECK (birthday_month >= 1 AND birthday_month <= 12),
  birthday_day INTEGER CHECK (birthday_day >= 1 AND birthday_day <= 31),
  birthday_year INTEGER,
  partner_name TEXT,
  kids JSONB DEFAULT '[]',  -- [{name, age?}]
  pets TEXT,
  alma_mater TEXT,
  hometown TEXT,
  hobbies TEXT[],
  personal_notes TEXT,

  -- System
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for contacts
CREATE INDEX idx_contacts_owner ON contacts(owner_id);
CREATE INDEX idx_contacts_tier ON contacts(owner_id, relationship_tier);
CREATE INDEX idx_contacts_health ON contacts(owner_id, health_score);
CREATE INDEX idx_contacts_next_due ON contacts(owner_id, next_contact_due_at);
CREATE INDEX idx_contacts_name_trgm ON contacts USING GIN (name gin_trgm_ops);
CREATE INDEX idx_contacts_company_trgm ON contacts USING GIN (company gin_trgm_ops);
CREATE INDEX idx_contacts_emails ON contacts USING GIN (emails);

-- ============================================================
-- RELATIONSHIP SUMMARIES
-- ============================================================
CREATE TABLE relationship_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID NOT NULL UNIQUE REFERENCES contacts(id) ON DELETE CASCADE,

  content TEXT NOT NULL,  -- The living narrative
  version INTEGER NOT NULL DEFAULT 1,
  last_interaction_at TIMESTAMPTZ,
  embedding vector(1536),  -- pgvector for semantic search

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_summaries_contact ON relationship_summaries(contact_id);
CREATE INDEX idx_summaries_embedding ON relationship_summaries
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- ============================================================
-- RELATIONSHIP SUMMARY VERSIONS (rollback only)
-- ============================================================
CREATE TABLE relationship_summary_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  version INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_summary_versions_contact ON relationship_summary_versions(contact_id, version DESC);

-- Auto-cleanup: keep only last 5 versions per contact
CREATE OR REPLACE FUNCTION cleanup_summary_versions()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM relationship_summary_versions
  WHERE contact_id = NEW.contact_id
    AND id NOT IN (
      SELECT id FROM relationship_summary_versions
      WHERE contact_id = NEW.contact_id
      ORDER BY version DESC
      LIMIT 5
    );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_cleanup_summary_versions
  AFTER INSERT ON relationship_summary_versions
  FOR EACH ROW EXECUTE FUNCTION cleanup_summary_versions();

-- ============================================================
-- INTERACTIONS (append-only audit log)
-- ============================================================
CREATE TABLE interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  interaction_type interaction_type NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  summary TEXT,  -- AI-generated, one sentence
  raw_content_encrypted BYTEA,  -- encrypted with pgcrypto
  source interaction_source NOT NULL DEFAULT 'manual',

  sentiment sentiment DEFAULT 'neutral',
  topics TEXT[] DEFAULT '{}',

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_interactions_contact ON interactions(contact_id, occurred_at DESC);
CREATE INDEX idx_interactions_owner ON interactions(owner_id);
CREATE INDEX idx_interactions_type ON interactions(contact_id, interaction_type);
CREATE INDEX idx_interactions_occurred ON interactions(occurred_at DESC);

-- ============================================================
-- INTROS
-- ============================================================
CREATE TABLE intros (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  from_contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  to_contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  introduced_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  context_notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_intros_owner ON intros(owner_id);
CREATE INDEX idx_intros_from ON intros(from_contact_id);
CREATE INDEX idx_intros_to ON intros(to_contact_id);

-- ============================================================
-- RELATIONSHIP NOTES
-- ============================================================
CREATE TABLE relationship_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  content TEXT NOT NULL,
  note_type note_type NOT NULL DEFAULT 'general',

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notes_contact ON relationship_notes(contact_id, created_at DESC);

-- ============================================================
-- CONTENT RECOMMENDATIONS
-- ============================================================
CREATE TABLE content_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  content_url TEXT NOT NULL,
  content_title TEXT,
  content_snippet TEXT,
  reason TEXT,  -- AI-generated
  source TEXT,
  status recommendation_status NOT NULL DEFAULT 'pending',

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_recommendations_contact ON content_recommendations(contact_id, status);

-- ============================================================
-- NETWORK SEEDS (onboarding import tracking)
-- ============================================================
CREATE TABLE network_seeds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  source seed_source NOT NULL,
  status seed_status NOT NULL DEFAULT 'pending',
  imported_at TIMESTAMPTZ,
  raw_data JSONB,
  error_message TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_seeds_owner ON network_seeds(owner_id, source);

-- ============================================================
-- VOICE SAMPLES (for outreach draft generation)
-- ============================================================
CREATE TABLE voice_samples (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  content TEXT NOT NULL,
  label TEXT,  -- optional label like "intro email" or "follow-up"

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_voice_samples_owner ON voice_samples(owner_id);

-- ============================================================
-- UPDATED_AT TRIGGER
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_contacts_updated_at
  BEFORE UPDATE ON contacts FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_summaries_updated_at
  BEFORE UPDATE ON relationship_summaries FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_notes_updated_at
  BEFORE UPDATE ON relationship_notes FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

### Row Level Security Policies

```sql
-- Enable RLS on all tables
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE relationship_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE relationship_summary_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE intros ENABLE ROW LEVEL SECURITY;
ALTER TABLE relationship_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE network_seeds ENABLE ROW LEVEL SECURITY;
ALTER TABLE voice_samples ENABLE ROW LEVEL SECURITY;

-- Contacts: owner can do everything
CREATE POLICY contacts_owner ON contacts
  FOR ALL USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- Relationship summaries: accessible via contact ownership
CREATE POLICY summaries_owner ON relationship_summaries
  FOR ALL USING (
    contact_id IN (SELECT id FROM contacts WHERE owner_id = auth.uid())
  )
  WITH CHECK (
    contact_id IN (SELECT id FROM contacts WHERE owner_id = auth.uid())
  );

-- Summary versions: same pattern
CREATE POLICY summary_versions_owner ON relationship_summary_versions
  FOR ALL USING (
    contact_id IN (SELECT id FROM contacts WHERE owner_id = auth.uid())
  );

-- Interactions: owner only
CREATE POLICY interactions_owner ON interactions
  FOR ALL USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- Intros: owner only
CREATE POLICY intros_owner ON intros
  FOR ALL USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- Notes: owner only
CREATE POLICY notes_owner ON relationship_notes
  FOR ALL USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- Recommendations: owner only
CREATE POLICY recommendations_owner ON content_recommendations
  FOR ALL USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- Seeds: owner only
CREATE POLICY seeds_owner ON network_seeds
  FOR ALL USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- Voice samples: owner only
CREATE POLICY voice_samples_owner ON voice_samples
  FOR ALL USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());
```

### Helper Functions

```sql
-- Fuzzy contact name search (used by MCP server)
CREATE OR REPLACE FUNCTION search_contacts_fuzzy(
  p_owner_id UUID,
  p_query TEXT,
  p_limit INTEGER DEFAULT 10
)
RETURNS TABLE(
  id UUID,
  name TEXT,
  company TEXT,
  title TEXT,
  similarity REAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT c.id, c.name, c.company, c.title,
         similarity(c.name, p_query) AS similarity
  FROM contacts c
  WHERE c.owner_id = p_owner_id
    AND (
      c.name % p_query
      OR c.name ILIKE '%' || p_query || '%'
      OR p_query = ANY(c.emails)
    )
  ORDER BY similarity(c.name, p_query) DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Semantic search across relationship summaries
CREATE OR REPLACE FUNCTION search_summaries_semantic(
  p_owner_id UUID,
  p_embedding vector(1536),
  p_limit INTEGER DEFAULT 10
)
RETURNS TABLE(
  contact_id UUID,
  contact_name TEXT,
  summary_content TEXT,
  similarity REAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT rs.contact_id, c.name, rs.content,
         1 - (rs.embedding <=> p_embedding) AS similarity
  FROM relationship_summaries rs
  JOIN contacts c ON c.id = rs.contact_id
  WHERE c.owner_id = p_owner_id
    AND rs.embedding IS NOT NULL
  ORDER BY rs.embedding <=> p_embedding
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Auto-update next_contact_due_at after interaction insert
CREATE OR REPLACE FUNCTION update_contact_after_interaction()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE contacts
  SET last_contacted_at = NEW.occurred_at,
      next_contact_due_at = NEW.occurred_at + (target_contact_interval_days || ' days')::INTERVAL,
      updated_at = NOW()
  WHERE id = NEW.contact_id
    AND (last_contacted_at IS NULL OR NEW.occurred_at > last_contacted_at);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_interaction_update_contact
  AFTER INSERT ON interactions
  FOR EACH ROW EXECUTE FUNCTION update_contact_after_interaction();
```

---

## 5. API Route Specifications

### Frontend Route Structure (Vue Router)

```
/                         → Dashboard
/contacts                 → Contact list
/contacts/:id             → Contact profile
/contacts/:id/prep        → Meeting prep view
/contacts/new             → Quick add + full add
/intros                   → Intro log + compose
/import                   → Data import hub
/import/onboarding        → Tiering wizard
/settings                 → Cadence defaults, voice samples, integrations
/login                    → Magic link auth
```

### Supabase Edge Functions (Server-Side AI)

All AI endpoints are Supabase Edge Functions (Deno runtime). They use the Supabase service role key internally and verify the caller's JWT.

#### `POST /functions/v1/ai-brief`
Generate a contact briefing for meeting prep.

**Request:**
```json
{
  "contact_id": "uuid"
}
```

**Response:**
```json
{
  "briefing": {
    "summary_recap": "string — relationship arc and current state",
    "last_interaction": {
      "date": "ISO date",
      "type": "string",
      "summary": "string"
    },
    "talking_points": ["string"],
    "questions_to_ask": ["string"],
    "follow_ups": ["string — open threads or commitments"],
    "personal_details": ["string — standout details to reference"]
  }
}
```

#### `POST /functions/v1/ai-draft`
Generate an outreach draft.

**Request:**
```json
{
  "contact_id": "uuid",
  "intent": "reconnect | share_resource | make_intro | general",
  "hint": "optional string — user's guidance"
}
```

**Response:**
```json
{
  "draft": {
    "subject": "string",
    "body": "string",
    "tone_notes": "string — brief note on style choices"
  }
}
```

#### `POST /functions/v1/ai-intro`
Compose an intro email between two contacts.

**Request:**
```json
{
  "from_contact_id": "uuid",
  "to_contact_id": "uuid",
  "context": "optional string"
}
```

**Response:**
```json
{
  "intro": {
    "subject": "string",
    "body": "string",
    "connection_points": ["string"]
  }
}
```

#### `POST /functions/v1/ai-rewrite-summary`
Rewrite a contact's relationship summary after new interaction/note. Called automatically, not by the user.

**Request:**
```json
{
  "contact_id": "uuid",
  "trigger": "interaction | note",
  "trigger_id": "uuid"
}
```

**Response:**
```json
{
  "new_version": 5,
  "content": "string — the new summary"
}
```

#### `POST /functions/v1/ai-extract-context`
Extract structured data from raw content (email, message, etc.) during import.

**Request:**
```json
{
  "contact_id": "uuid",
  "raw_content": "string",
  "content_type": "email | text | linkedin_message"
}
```

**Response:**
```json
{
  "interaction": {
    "summary": "string",
    "topics": ["string"],
    "sentiment": "positive | neutral | negative",
    "commitments": ["string"],
    "standout_details": ["string"]
  }
}
```

#### `POST /functions/v1/cron-health`
Nightly health score recalculation. Triggered by Supabase cron (pg_cron) or external scheduler.

**Request:** (no body — uses service role key)

**Response:**
```json
{
  "contacts_updated": 247,
  "alerts_generated": 12
}
```

### Import Endpoints (Edge Functions)

#### `POST /functions/v1/import-linkedin-csv`
Upload and parse LinkedIn connections.csv.

**Request:** multipart/form-data with `file` field

**Response:**
```json
{
  "imported": 1482,
  "skipped": 18,
  "errors": []
}
```

#### `POST /functions/v1/import-linkedin-messages`
Upload and parse LinkedIn messages.csv.

**Request:** multipart/form-data with `file` field

**Response:**
```json
{
  "threads_processed": 312,
  "interactions_created": 845,
  "contacts_matched": 287,
  "unmatched_participants": ["Name A", "Name B"]
}
```

#### `POST /functions/v1/import-imessage`
Upload JSON exported by the local CLI tool.

**Request:**
```json
{
  "messages": [
    {
      "contact_phone": "+1234567890",
      "contact_name": "string",
      "messages": [
        { "text": "string", "date": "ISO date", "is_from_me": true }
      ]
    }
  ]
}
```

#### `POST /functions/v1/import-granola`
Query Granola MCP and import meeting notes.

**Request:**
```json
{
  "contact_id": "uuid",
  "mode": "single | bulk"
}
```

#### `POST /functions/v1/import-gmail`
Initiate Gmail import flow.

**Request:**
```json
{
  "auth_code": "string — OAuth authorization code"
}
```

---

## 6. AI Prompt Library

### 6.1 Contact Briefing (Meeting Prep)

```
System prompt:
You are Apollonia, a personal relationship intelligence assistant. You help {owner_name} prepare for meetings by synthesizing everything known about a contact into a concise, actionable briefing.

Your briefings should read like notes from a trusted colleague who knows this relationship well. Be warm but efficient. Highlight what matters for the conversation ahead.

User prompt:
Prepare a briefing for my upcoming interaction with {contact_name}.

## Relationship Summary
{relationship_summary_content}

## Recent Interactions (last 3-5)
{recent_interactions_formatted}

## Contact Profile
- Company: {company}
- Title: {title}
- Relationship: {relationship_type} ({relationship_tier} tier)
- Health Score: {health_score}/100
- Last Contacted: {last_contacted_at}
- Standout Details: {standout_details_formatted}
- Personal: {personal_details_formatted}

Produce a briefing with these sections:
1. **Relationship Recap** — 2-3 sentences on the arc of this relationship
2. **Last Interaction** — What happened last time and anything unresolved
3. **Talking Points** — 3-5 specific things to bring up
4. **Questions to Ask** — 2-3 genuine questions based on what you know about them
5. **Follow-Ups** — Any open threads or commitments from either side
6. **Personal Touch** — Any personal details worth referencing naturally

Return as JSON matching the briefing schema.
```

### 6.2 Relationship Summary Rewrite

```
System prompt:
You are Apollonia's relationship memory system. Your job is to maintain a living summary of {owner_name}'s relationship with each contact. This summary is the primary briefing surface — it must contain everything someone would need to understand this relationship at a glance.

Write like a trusted colleague's briefing note. Not a log. Not a timeline. A living understanding. Under 400 words.

User prompt:
Rewrite the relationship summary for {contact_name} incorporating the new {trigger_type}.

## Current Summary (version {current_version})
{current_summary}

## New {trigger_type}
{new_content}

## Contact Profile
{contact_profile_summary}

Instructions:
- Incorporate what's new from this {trigger_type}
- Preserve everything still relevant from the current summary
- Drop anything superseded or no longer meaningful
- Cover: relationship arc, recurring themes, how they met and why it matters, standout personal details, current status, open threads or commitments
- Keep under 400 words
- Write in third person ("They recently..." not "You recently...")
- Be specific — names, dates, details matter

Return only the new summary text.
```

### 6.3 Health Scoring (Pure Math — No AI)

```python
# Pseudocode — implemented in Edge Function or cron job
def compute_health_score(contact):
    # 1. Recency score (0-40 points)
    days_since = (now - contact.last_contacted_at).days
    target = contact.target_contact_interval_days
    if days_since <= target:
        recency = 40
    elif days_since <= target * 2:
        recency = 40 * exp(-0.5 * (days_since - target) / target)
    else:
        recency = max(0, 40 * exp(-1.0 * (days_since - target) / target))

    # 2. Momentum score (0-30 points)
    recent_90 = count_interactions(contact, last_90_days)
    prior_90 = count_interactions(contact, prior_90_days)
    if prior_90 == 0:
        momentum = 15 if recent_90 > 0 else 0
    else:
        ratio = recent_90 / prior_90
        momentum = min(30, 15 * ratio)

    # 3. Depth score (0-30 points)
    # Weight: meeting/call = 3, coffee = 3, email = 2, linkedin/text = 1, social = 0.5
    depth_weights = {meeting: 3, call: 3, coffee: 3, email: 2, text: 1, linkedin_message: 1, ...}
    weighted_sum = sum(depth_weights[i.type] for i in recent_interactions)
    depth = min(30, weighted_sum * 3)

    return round(recency + momentum + depth)
```

### 6.4 Outreach Draft Generation

```
System prompt:
You are a ghostwriter for {owner_name}. Your job is to draft professional outreach that sounds authentically like them — warm, thoughtful, and personal. Never generic. Never corporate.

## Voice Samples
{voice_samples — 5-10 example emails the owner is proud of}

Match the tone, sentence structure, and personality of these samples. The recipient should never suspect this was AI-generated.

User prompt:
Draft an outreach email to {contact_name}.

## Intent: {intent}
## User Hint: {hint_if_provided}

## Relationship Summary
{relationship_summary}

## Recent Interactions
{recent_interactions}

## Contact Profile
{contact_basics}

Write a subject line and email body. Be specific — reference real details from the relationship. Keep it concise. The goal is to sound like {owner_name} wrote this in 2 minutes, not like a form letter.

Return JSON: { "subject": "...", "body": "...", "tone_notes": "..." }
```

### 6.5 Intro Email Composer

```
System prompt:
You are helping {owner_name} compose a warm double opt-in introduction email. The intro should feel natural, explain why these two people should know each other, and make both parties feel valued.

User prompt:
Compose an intro between {contact_a_name} and {contact_b_name}.

## Contact A: {contact_a_name}
{contact_a_summary}
{contact_a_profile}

## Contact B: {contact_b_name}
{contact_b_summary}
{contact_b_profile}

## Additional Context
{user_provided_context}

Write:
1. The connection points — why these two people would benefit from knowing each other
2. A subject line
3. The intro email body (double opt-in style: "I'd love to connect you with...")

Return JSON: { "subject": "...", "body": "...", "connection_points": ["..."] }
```

### 6.6 Passive Context Extraction (Import Pipeline)

```
System prompt:
You are an information extraction system. Given a raw message or email, extract structured data about the professional interaction. Be precise and factual. Do not infer what isn't there.

User prompt:
Extract interaction metadata from this {content_type}:

---
{raw_content}
---

Extract:
1. **summary** — One sentence describing what this interaction was about
2. **topics** — Array of topics discussed (2-5 words each)
3. **sentiment** — positive, neutral, or negative
4. **commitments** — Any promises, follow-ups, or action items mentioned by either party
5. **standout_details** — Personal details worth remembering (family events, hobbies, career moves, opinions)

Return JSON matching the extraction schema. If a field has no data, return empty array or null.
```

---

## 7. MCP Server Implementation Spec

### Overview

The MCP server is a standalone Express/Node.js service deployed on Railway. It authenticates against Supabase using a service role key and exposes tools via SSE transport for Claude.ai compatibility.

### Technology

- **Runtime:** Node.js 20+
- **Framework:** Express + `@modelcontextprotocol/sdk`
- **Transport:** SSE (Server-Sent Events) for Claude.ai
- **Auth:** Supabase service role key (server-to-server)
- **Deployment:** Railway

### Tool Definitions

#### Write Tools

```typescript
// apollonia_log_interaction
{
  name: "apollonia_log_interaction",
  description: "Log a professional interaction with a contact in Apollonia CRM. Use after the owner describes a meeting, email, call, coffee, text, or LinkedIn exchange.",
  inputSchema: {
    type: "object",
    properties: {
      contact_name: { type: "string", description: "Name of the contact (fuzzy matched)" },
      type: {
        type: "string",
        enum: ["email", "text", "linkedin_message", "meeting", "coffee", "call", "event", "intro_made", "intro_received", "social_media_comment"],
        description: "Type of interaction"
      },
      summary: { type: "string", description: "One-sentence summary of what happened" },
      details: {
        type: "object",
        properties: {
          topics: { type: "array", items: { type: "string" } },
          sentiment: { type: "string", enum: ["positive", "neutral", "negative"] },
          standout_details: { type: "array", items: { type: "string" } },
          commitments: { type: "array", items: { type: "string" } }
        }
      },
      occurred_at: { type: "string", description: "ISO date of the interaction (defaults to now)" }
    },
    required: ["contact_name", "type", "summary"]
  }
}

// apollonia_update_contact
{
  name: "apollonia_update_contact",
  description: "Update a contact's profile in Apollonia. Use when new information is learned about a contact (job change, personal detail, etc.)",
  inputSchema: {
    type: "object",
    properties: {
      contact_name: { type: "string", description: "Name of the contact (fuzzy matched)" },
      updates: {
        type: "object",
        properties: {
          company: { type: "string" },
          title: { type: "string" },
          location: { type: "string" },
          linkedin_url: { type: "string" },
          relationship_type: { type: "string" },
          relationship_tier: { type: "string" },
          bio_notes: { type: "string" },
          new_standout_detail: { type: "string", description: "A new personal detail to add to standout_details" },
          personal: {
            type: "object",
            properties: {
              partner_name: { type: "string" },
              kids: { type: "array" },
              pets: { type: "string" },
              alma_mater: { type: "string" },
              hometown: { type: "string" },
              hobbies: { type: "array", items: { type: "string" } }
            }
          }
        }
      }
    },
    required: ["contact_name", "updates"]
  }
}

// apollonia_add_contact
{
  name: "apollonia_add_contact",
  description: "Add a new contact to Apollonia CRM. Always confirm with the owner before creating.",
  inputSchema: {
    type: "object",
    properties: {
      name: { type: "string" },
      how_met: { type: "string" },
      company: { type: "string" },
      title: { type: "string" },
      email: { type: "string" },
      linkedin_url: { type: "string" },
      relationship_type: { type: "string" },
      relationship_tier: { type: "string", default: "active" },
      standout_details: { type: "array", items: { type: "string" } }
    },
    required: ["name"]
  }
}

// apollonia_log_intro
{
  name: "apollonia_log_intro",
  description: "Log an introduction made between two contacts.",
  inputSchema: {
    type: "object",
    properties: {
      from_name: { type: "string", description: "Person A being introduced" },
      to_name: { type: "string", description: "Person B being introduced" },
      context: { type: "string", description: "Why the intro was made" }
    },
    required: ["from_name", "to_name"]
  }
}
```

#### Read Tools

```typescript
// apollonia_get_contact
{
  name: "apollonia_get_contact",
  description: "Get a contact's full profile including relationship summary.",
  inputSchema: {
    type: "object",
    properties: {
      name_or_email: { type: "string" }
    },
    required: ["name_or_email"]
  }
}

// apollonia_get_summary
{
  name: "apollonia_get_summary",
  description: "Get just the relationship summary for a contact. Fast and lightweight.",
  inputSchema: {
    type: "object",
    properties: {
      contact_name: { type: "string" }
    },
    required: ["contact_name"]
  }
}

// apollonia_list_contacts
{
  name: "apollonia_list_contacts",
  description: "List contacts with optional filters.",
  inputSchema: {
    type: "object",
    properties: {
      tier: { type: "string", enum: ["core", "active", "dormant", "archived"] },
      type: { type: "string" },
      health_below: { type: "number", description: "Only contacts with health score below this" },
      limit: { type: "number", default: 20 }
    }
  }
}

// apollonia_get_brief
{
  name: "apollonia_get_brief",
  description: "Generate a full AI briefing for a contact. Includes summary, talking points, and follow-ups.",
  inputSchema: {
    type: "object",
    properties: {
      contact_name: { type: "string" }
    },
    required: ["contact_name"]
  }
}

// apollonia_get_due_outreach
{
  name: "apollonia_get_due_outreach",
  description: "Get contacts that are overdue for outreach.",
  inputSchema: {
    type: "object",
    properties: {
      limit: { type: "number", default: 10 }
    }
  }
}

// apollonia_search_contacts
{
  name: "apollonia_search_contacts",
  description: "Semantic search across relationship summaries. Use for queries like 'who works in edtech' or 'who did I meet at the conference'.",
  inputSchema: {
    type: "object",
    properties: {
      query: { type: "string" }
    },
    required: ["query"]
  }
}
```

### MCP Server Implementation Details

**Handler flow for write tools:**

1. Receive tool call from Claude
2. Fuzzy-match `contact_name` against contacts table using `search_contacts_fuzzy()`
3. If no match: return error asking Claude to confirm creating a new contact
4. If single match: proceed with the operation
5. If multiple matches: return the matches and ask Claude to disambiguate
6. After successful write: trigger `ai-rewrite-summary` Edge Function asynchronously
7. Return confirmation message

**Railway Deployment:**

```toml
# railway.toml
[build]
builder = "nixpacks"

[deploy]
startCommand = "node dist/index.js"
healthcheckPath = "/health"
healthcheckTimeout = 10

[service]
name = "apollonia-mcp"
```

**Environment Variables (Railway):**
```
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
ANTHROPIC_API_KEY=sk-ant-...
PORT=3000
```

---

## 8. Claude Skill Definition

This is the system prompt fragment deployed in Claude.ai (via Claude Projects or MCP config) that activates Apollonia CRM intake behavior:

```
You have access to Apollonia, P.J.'s personal relationship management system. Whenever P.J. describes a professional interaction — a meeting, email, call, coffee, text, LinkedIn message, or introduction — automatically extract the relevant details and log them.

**Intake behavior:**
1. Detect interaction context in the message (explicit: "I just had coffee with..." or implicit: pasted email/message content)
2. Identify the contact by name. Call apollonia_get_contact() to verify they exist. If no match, ask P.J. before creating a new contact.
3. Extract silently: interaction type, one-sentence summary, topics discussed, sentiment, any standout personal details, any commitments or follow-ups mentioned
4. Call apollonia_log_interaction() with the extracted data
5. If new personal details were mentioned (job change, family news, hobby, milestone), also call apollonia_update_contact() to add them as standout details
6. Confirm with one concise line: "Logged [type] with [Name]: [summary]"

**Important rules:**
- Never log without first confirming the contact exists or getting approval to create them
- If P.J. mentions an intro ("I introduced X to Y"), call apollonia_log_intro()
- For pasted email/message content, extract the summary — don't store the raw content
- If multiple contacts are mentioned in one message, log separate interactions for each
- Default occurred_at to today unless P.J. specifies otherwise
- Keep confirmations brief — one line, not a paragraph
```

---

## 9. Data Pipeline Pseudocode

### 9.1 LinkedIn CSV Import (connections.csv)

```
function importLinkedInConnections(csvFile, ownerId):
  rows = parseCSV(csvFile)
  // Expected columns: First Name, Last Name, Email Address, Company, Position, Connected On, URL

  imported = 0
  skipped = 0

  for row in rows:
    name = `${row['First Name']} ${row['Last Name']}`.trim()
    if not name or name == ' ':
      skipped++
      continue

    // Check for existing contact by LinkedIn URL or name+company
    existing = findContact(ownerId, {
      linkedin_url: row['URL'],
      name: name,
      company: row['Company']
    })

    if existing:
      // Update LinkedIn URL if missing
      if not existing.linkedin_url and row['URL']:
        updateContact(existing.id, { linkedin_url: row['URL'] })
      skipped++
      continue

    // Create new contact as dormant
    createContact({
      owner_id: ownerId,
      name: name,
      emails: row['Email Address'] ? [row['Email Address']] : [],
      company: row['Company'],
      title: row['Position'],
      linkedin_url: row['URL'],
      date_met: parseDate(row['Connected On']),
      relationship_tier: 'dormant',
      how_met: 'LinkedIn connection'
    })

    // Track in network_seeds
    createSeed({
      owner_id: ownerId,
      source: 'linkedin_csv',
      status: 'imported',
      raw_data: row
    })

    imported++

  return { imported, skipped }
```

### 9.2 LinkedIn Messages Import (messages.csv)

```
function importLinkedInMessages(csvFile, ownerId):
  rows = parseCSV(csvFile)
  // Group messages by conversation (FROM + TO pairs)

  conversations = groupByConversation(rows)

  for conversation in conversations:
    participantName = conversation.otherParticipant

    // Fuzzy match contact
    contact = fuzzyMatchContact(ownerId, participantName)
    if not contact:
      logUnmatched(participantName)
      continue

    // Group messages into logical threads (by date proximity)
    threads = groupIntoThreads(conversation.messages, maxGapDays=7)

    for thread in threads:
      // Send thread to Claude for context extraction
      extraction = callEdgeFunction('ai-extract-context', {
        contact_id: contact.id,
        raw_content: formatThread(thread),
        content_type: 'linkedin_message'
      })

      // Create interaction record
      createInteraction({
        contact_id: contact.id,
        owner_id: ownerId,
        interaction_type: 'linkedin_message',
        occurred_at: thread.latestDate,
        summary: extraction.summary,
        topics: extraction.topics,
        sentiment: extraction.sentiment,
        source: 'linkedin_import',
        raw_content_encrypted: encrypt(formatThread(thread))
      })

    // Trigger summary rewrite for this contact
    triggerSummaryRewrite(contact.id)
```

### 9.3 Gmail Import

```
function importGmail(authCode, ownerId):
  // 1. Exchange auth code for tokens (read-only scope: gmail.readonly)
  tokens = exchangeOAuthCode(authCode, GMAIL_READONLY_SCOPE)

  // 2. Get all contact emails from Apollonia
  contacts = listContacts(ownerId)
  emailToContact = buildEmailMap(contacts)  // email -> contact_id

  // 3. For each contact with an email, search Gmail
  for contact in contacts:
    for email in contact.emails:
      threads = searchGmailThreads(tokens, `from:${email} OR to:${email}`, maxResults=50)

      for thread in threads:
        // Check if already imported (dedup by message ID)
        if isAlreadyImported(thread.messageId):
          continue

        // Extract context via Claude
        extraction = callEdgeFunction('ai-extract-context', {
          contact_id: contact.id,
          raw_content: thread.snippet + thread.body,
          content_type: 'email'
        })

        createInteraction({
          contact_id: contact.id,
          owner_id: ownerId,
          interaction_type: 'email',
          occurred_at: thread.date,
          summary: extraction.summary,
          topics: extraction.topics,
          sentiment: extraction.sentiment,
          source: 'gmail_import',
          raw_content_encrypted: encrypt(thread.body)
        })

      // Trigger summary rewrite
      triggerSummaryRewrite(contact.id)

  // 4. Phase 3 signal: find contacts with recent email but dormant tier
  dormantWithEmail = findDormantContactsWithRecentEmail(ownerId)
  return { imported: count, tierCandidates: dormantWithEmail }
```

### 9.4 iMessage Export CLI

```
// Local Node.js CLI tool — runs on owner's Mac only
// File: scripts/imessage-export.ts

function main():
  // 1. Open ~/Library/Messages/chat.db (read-only)
  db = openSQLite(expandPath('~/Library/Messages/chat.db'), READONLY)

  // 2. Query recent messages (last N days, configurable)
  days = parseArgs().days || 90

  messages = db.query(`
    SELECT
      m.ROWID, m.text, m.date, m.is_from_me,
      h.id AS handle_id, h.service
    FROM message m
    JOIN handle h ON m.handle_id = h.ROWID
    WHERE m.date > ?
    ORDER BY m.date ASC
  `, [macAbsoluteTime(daysAgo(days))])

  // 3. Group by handle (phone number / email)
  conversations = groupBy(messages, 'handle_id')

  // 4. Format as JSON
  output = conversations.map(conv => ({
    contact_phone: conv.handle_id,
    contact_name: lookupContactName(conv.handle_id),  // from macOS Contacts
    messages: conv.messages.map(m => ({
      text: m.text,
      date: macTimeToISO(m.date),
      is_from_me: m.is_from_me === 1
    }))
  }))

  // 5. Write to file
  writeFile('imessage-export.json', JSON.stringify(output, null, 2))
  console.log(`Exported ${messages.length} messages from ${conversations.length} conversations`)
  console.log('Upload this file to Apollonia at /import')
```

### 9.5 Granola MCP Import

```
function importGranolaMeetings(contactId, mode, ownerId):
  // mode: 'single' (one contact) or 'bulk' (all active contacts)

  contacts = mode === 'single'
    ? [getContact(contactId)]
    : listContacts(ownerId, { tier: ['core', 'active'] })

  for contact in contacts:
    // Query Granola MCP for meetings involving this contact
    meetings = queryGranolaMCP({
      query: `meetings with ${contact.name}`,
      // Granola MCP tools: query_granola_meetings, list_meetings, get_meetings
    })

    for meeting in meetings:
      // Check if already imported
      if isAlreadyImported(meeting.id, 'granola_import'):
        continue

      // Get meeting details
      details = getGranolaMeeting(meeting.id)

      createInteraction({
        contact_id: contact.id,
        owner_id: ownerId,
        interaction_type: 'meeting',
        occurred_at: meeting.date,
        summary: details.aiSummary || details.title,
        topics: details.topics || [],
        source: 'granola_import'
      })

    // Trigger summary rewrite
    if meetings.length > 0:
      triggerSummaryRewrite(contact.id)
```

---

## 10. Phased Sprint Plan

### Phase 0 — Foundation + MCP (Week 1-2)

#### Week 1: Schema + Scaffold
- [ ] Create new Supabase project for Apollonia
- [ ] Run schema migration (all tables, RLS, functions, pgvector, triggers)
- [ ] Scaffold Vue 3 + Vite project with Tailwind CSS + shadcn-vue
- [ ] Port design tokens from Tessio (CSS variables, IBM Plex Sans, color palette)
- [ ] Implement auth flow (Supabase magic link + Luca session sync)
- [ ] Build AppHeader component (matching family style)
- [ ] Build login page + landing page
- [ ] Set up Vercel deployment (frontend)

#### Week 2: Contact CRUD + MCP
- [ ] Contact list page (`/contacts`) with search, filter by tier/type
- [ ] Contact profile page (`/contacts/:id`) — header, about section, personal details panel
- [ ] Quick-add contact flow (`/contacts/new`)
- [ ] Manual interaction logging (modal from contact profile)
- [ ] Scaffold MCP server (Express + @modelcontextprotocol/sdk)
- [ ] Implement all 10 MCP tools (4 write, 6 read)
- [ ] Deploy MCP server to Railway
- [ ] Write and test Claude skill definition in Claude.ai
- [ ] Verify end-to-end: describe interaction in Claude.ai → logged in Apollonia

### Phase 1 — Core Intelligence (Week 3-4)

#### Week 3: AI + Health
- [ ] Implement health scoring cron (Supabase Edge Function + pg_cron)
- [ ] Build health score display on contact profile (visual gauge, breakdown)
- [ ] Implement relationship summary rewrite Edge Function
- [ ] Wire summary rewrite trigger after interaction logging
- [ ] Generate initial summaries for all contacts with interactions
- [ ] Implement embedding generation (background job after summary rewrite)
- [ ] Build semantic search (`apollonia_search_contacts` + Cmd+K in UI)

#### Week 4: Briefing + Outreach
- [ ] Implement contact briefing Edge Function (`ai-brief`)
- [ ] Build meeting prep view (`/contacts/:id/prep`) — focused, distraction-free
- [ ] Implement outreach draft Edge Function (`ai-draft`)
- [ ] Build "Draft Outreach" modal on contact profile
- [ ] Build dashboard (`/`) — needs attention, upcoming, recently added, quick stats
- [ ] Implement voice sample storage in settings
- [ ] Wire voice samples into outreach draft prompts

### Phase 2 — Batch Ingestion (Week 5-6)

#### Week 5: LinkedIn + Tiering
- [ ] Build import hub page (`/import`) with status cards per source
- [ ] Implement LinkedIn connections.csv upload + parse
- [ ] Implement LinkedIn messages.csv upload + parse + Claude extraction
- [ ] Build tiering wizard (`/import/onboarding`) — card-based batch UI
- [ ] Implement tier assignment flow (Core / Active / Skip per contact)

#### Week 6: Gmail + Granola + iMessage
- [ ] Gmail OAuth setup (read-only scope)
- [ ] Implement Gmail thread import pipeline
- [ ] Gmail signal augmentation: auto-identify active candidates from dormant
- [ ] Build iMessage export CLI tool (`scripts/imessage-export.ts`)
- [ ] Implement iMessage JSON upload endpoint
- [ ] Implement Granola MCP integration (single contact + bulk)
- [ ] Wire Granola import into contact profile ("Import Granola meetings")

### Phase 3 — Relationship Features (Week 7-8)

#### Week 7: Intros + Content
- [ ] Build intro composer (`/intros`) — select two contacts, compose intro
- [ ] Implement intro email AI endpoint (`ai-intro`)
- [ ] Build intro log view (history of intros made/received)
- [ ] Auto-log intro interactions on both contacts
- [ ] Implement content recommendation engine (stub — needs content sources)
- [ ] Build recommendations panel on contact profile

#### Week 8: Dashboard + Voice
- [ ] Build "Needs Attention" feed (dashboard widget + standalone)
- [ ] Implement voice-to-text quick capture (Web Speech API → Claude structuring)
- [ ] Build mobile-optimized quick-add flow
- [ ] Build mobile-optimized post-meeting voice capture
- [ ] Interaction history on contact profile: timeline, filter by type, expandable
- [ ] Notes tab on contact profile (CRUD, markdown, type selector)
- [ ] Relationship intelligence panel (charts, topics, intro network)

### Phase 4 — Polish (Week 9-10)

#### Week 9: Responsive + Security
- [ ] Mobile-responsive audit across all screens
- [ ] Encryption audit: verify raw content is encrypted, summaries are plaintext
- [ ] RLS audit: verify every query is scoped to owner
- [ ] API key handling audit: no client-side exposure
- [ ] Performance audit: query optimization, lazy loading, pagination

#### Week 10: Onboarding + Documentation
- [ ] Onboarding flow polish: first-run wizard, import prompts, tiering guidance
- [ ] Settings page: cadence defaults, voice samples, integration status
- [ ] In-app privacy statement
- [ ] Stub Proxycurl integration point (documented, not built)
- [ ] End-to-end testing: full workflow from contact creation to briefing to outreach
- [ ] Data migration: run migration script for existing contacts

---

## 11. Open Questions

### Must Decide Before Building

1. **Vue 3 vs. Next.js?** — All sibling apps are Vue 3 + Vite. The spec says Next.js 14. This plan recommends Vue 3 for family consistency. **P.J. must decide.**

2. **New Supabase project or shared?** — Current Apollonia shares a Railway Postgres with Genco. The spec says Supabase. Should Apollonia get its own Supabase project, or share with Genco? **Recommendation: own project.** Cleaner RLS, independent scaling, no cross-app migration risk.

3. **Embedding model?** — The schema uses `vector(1536)` which matches OpenAI's text-embedding-3-small. Anthropic doesn't offer embeddings. Options: (a) OpenAI embeddings API, (b) Voyage AI (Anthropic-recommended), (c) Supabase's built-in embeddings. **Recommendation: Voyage AI** — best quality for the use case, Anthropic-aligned.

4. **MCP server auth?** — The MCP server uses a Supabase service role key. But who authenticates the MCP *caller*? Options: (a) No auth — the MCP server is only accessible from Claude.ai which is already authenticated by the owner, (b) Bearer token in MCP config. **Recommendation: Bearer token** — simple, prevents unauthorized access if the Railway URL leaks.

5. **Supabase Edge Functions or separate backend?** — Edge Functions (Deno) are convenient but limited (CPU time, cold starts). A separate Hono/Express server on Railway is more flexible. **Recommendation: Edge Functions for AI calls** (they're infrequent, latency-tolerant), **Supabase client SDK for CRUD** (direct from frontend with RLS).

6. **Should Apollonia read from Genco's database?** — Current Apollonia reads Genco's `network_contacts`, `contact_context`, and `sender_summaries`. In the rewrite, should this continue? **Recommendation: One-time migration, then independent.** Import existing Genco data during migration, then Apollonia owns its own contact records going forward. Future Genco integration via MCP or API, not shared database.

7. **Voice sample storage?** — The spec mentions 5-10 example emails for voice training. Where to store? Options: (a) Supabase table (done in schema), (b) Claude.ai project instructions. **Recommendation: Both.** Store in DB for the web UI settings page. Also include in Claude.ai project instructions so Claude uses them in all contexts.

### Nice to Clarify

8. **LinkedIn OAuth scope?** — The spec says "identity linking only at add-time." This means LinkedIn OAuth is used to fetch basic profile (name, headline, URL) when adding a contact. No polling, no feed. Is this correct, or should we skip LinkedIn OAuth entirely and just use CSV import + manual URL entry?

9. **Encryption approach?** — The spec says encrypted at rest. Options: (a) Supabase Vault (managed encryption), (b) pgcrypto `pgp_sym_encrypt`/`pgp_sym_decrypt` with app-managed key, (c) application-level encryption before writing. **Recommendation: pgcrypto** — transparent, works with RLS, key stored in Edge Function env vars.

10. **Nightly cron trigger?** — Supabase supports `pg_cron` for scheduled jobs. Alternative: Railway cron or external scheduler (e.g., Vercel cron). **Recommendation: pg_cron** via Supabase — runs inside the database, no external service needed.

11. **How should Apollonia and Genco coordinate going forward?** — Once Genco is built, it will scan emails. Should it push interaction data to Apollonia via MCP? Via shared database? Via webhook? **Recommendation: Genco calls Apollonia's MCP tools** — same pattern as Claude-mediated intake, keeps the interface clean.

---

*End of Technical Plan — Apollonia v2*
