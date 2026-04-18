-- Apollonia v2 — Complete Schema Migration
-- Run against a fresh Supabase project

-- ============================================================
-- EXTENSIONS
-- ============================================================
-- "vector" extension (pgvector) — already enabled via Supabase Vector
CREATE EXTENSION IF NOT EXISTS "vector" WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS "pg_trgm" WITH SCHEMA extensions;

-- ============================================================
-- ENUMS
-- ============================================================
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

-- ============================================================
-- TABLES
-- ============================================================

CREATE TABLE contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  emails TEXT[] DEFAULT '{}',
  phones TEXT[] DEFAULT '{}',
  linkedin_url TEXT,
  company TEXT,
  title TEXT,
  location TEXT,
  how_met TEXT,
  introduced_by UUID REFERENCES contacts(id) ON DELETE SET NULL,
  date_met DATE,
  relationship_type relationship_type DEFAULT 'other',
  relationship_tier relationship_tier DEFAULT 'dormant',
  target_contact_interval_days INTEGER DEFAULT 30,
  last_contacted_at TIMESTAMPTZ,
  next_contact_due_at TIMESTAMPTZ,
  health_score INTEGER DEFAULT 50 CHECK (health_score >= 0 AND health_score <= 100),
  bio_notes TEXT,
  standout_details JSONB DEFAULT '[]',
  linkedin_headline_snapshot TEXT,
  birthday_month INTEGER CHECK (birthday_month >= 1 AND birthday_month <= 12),
  birthday_day INTEGER CHECK (birthday_day >= 1 AND birthday_day <= 31),
  birthday_year INTEGER,
  partner_name TEXT,
  kids JSONB DEFAULT '[]',
  pets TEXT,
  alma_mater TEXT,
  hometown TEXT,
  hobbies TEXT[] DEFAULT '{}',
  personal_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_contacts_owner ON contacts(owner_id);
CREATE INDEX idx_contacts_tier ON contacts(owner_id, relationship_tier);
CREATE INDEX idx_contacts_health ON contacts(owner_id, health_score);
CREATE INDEX idx_contacts_next_due ON contacts(owner_id, next_contact_due_at);
CREATE INDEX idx_contacts_name_trgm ON contacts USING GIN (name gin_trgm_ops);
CREATE INDEX idx_contacts_company_trgm ON contacts USING GIN (company gin_trgm_ops);
CREATE INDEX idx_contacts_emails ON contacts USING GIN (emails);

CREATE TABLE relationship_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID NOT NULL UNIQUE REFERENCES contacts(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  last_interaction_at TIMESTAMPTZ,
  embedding vector(1536),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_summaries_contact ON relationship_summaries(contact_id);
CREATE INDEX idx_summaries_embedding ON relationship_summaries
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

CREATE TABLE relationship_summary_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  version INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_summary_versions_contact ON relationship_summary_versions(contact_id, version DESC);

CREATE TABLE interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  interaction_type interaction_type NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  summary TEXT,
  raw_content_encrypted BYTEA,
  source interaction_source NOT NULL DEFAULT 'manual',
  sentiment sentiment DEFAULT 'neutral',
  topics TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_interactions_contact ON interactions(contact_id, occurred_at DESC);
CREATE INDEX idx_interactions_owner ON interactions(owner_id);
CREATE INDEX idx_interactions_type ON interactions(contact_id, interaction_type);

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

CREATE TABLE content_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content_url TEXT NOT NULL,
  content_title TEXT,
  content_snippet TEXT,
  reason TEXT,
  source TEXT,
  status recommendation_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_recommendations_contact ON content_recommendations(contact_id, status);

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

CREATE TABLE voice_samples (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  label TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_voice_samples_owner ON voice_samples(owner_id);

-- ============================================================
-- FUNCTIONS & TRIGGERS
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

-- Auto-cleanup: keep only last 5 summary versions per contact
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

-- Auto-update contact after interaction
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

-- Fuzzy contact name search
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
  sim REAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT c.id, c.name, c.company, c.title,
         similarity(c.name, p_query) AS sim
  FROM contacts c
  WHERE c.owner_id = p_owner_id
    AND (c.name % p_query OR c.name ILIKE '%' || p_query || '%' OR p_query = ANY(c.emails))
  ORDER BY similarity(c.name, p_query) DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Semantic search across summaries
CREATE OR REPLACE FUNCTION search_summaries_semantic(
  p_owner_id UUID,
  p_embedding vector(1536),
  p_limit INTEGER DEFAULT 10
)
RETURNS TABLE(
  contact_id UUID,
  contact_name TEXT,
  summary_content TEXT,
  sim REAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT rs.contact_id, c.name, rs.content,
         1 - (rs.embedding <=> p_embedding) AS sim
  FROM relationship_summaries rs
  JOIN contacts c ON c.id = rs.contact_id
  WHERE c.owner_id = p_owner_id AND rs.embedding IS NOT NULL
  ORDER BY rs.embedding <=> p_embedding
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE relationship_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE relationship_summary_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE intros ENABLE ROW LEVEL SECURITY;
ALTER TABLE relationship_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE network_seeds ENABLE ROW LEVEL SECURITY;
ALTER TABLE voice_samples ENABLE ROW LEVEL SECURITY;

CREATE POLICY contacts_owner ON contacts FOR ALL USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());

CREATE POLICY summaries_owner ON relationship_summaries FOR ALL
  USING (contact_id IN (SELECT id FROM contacts WHERE owner_id = auth.uid()))
  WITH CHECK (contact_id IN (SELECT id FROM contacts WHERE owner_id = auth.uid()));

CREATE POLICY summary_versions_owner ON relationship_summary_versions FOR ALL
  USING (contact_id IN (SELECT id FROM contacts WHERE owner_id = auth.uid()));

CREATE POLICY interactions_owner ON interactions FOR ALL USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
CREATE POLICY intros_owner ON intros FOR ALL USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
CREATE POLICY notes_owner ON relationship_notes FOR ALL USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
CREATE POLICY recommendations_owner ON content_recommendations FOR ALL USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
CREATE POLICY seeds_owner ON network_seeds FOR ALL USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
CREATE POLICY voice_samples_owner ON voice_samples FOR ALL USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
