# Apollonia — Pickup Plan

**Last session:** 2026-04-12
**Status:** Phase 0 foundation complete. Schema deployed, frontend compiles, MCP server written but not deployed.

---

## What's Done

- [x] Full planning doc with all 11 deliverables (`PLANNING.md`)
- [x] Supabase schema deployed (9 tables, RLS, triggers, fuzzy search, pgvector)
- [x] Vue 3 + Vite + Tailwind v4 frontend with all Phase 0-1 pages
- [x] Auth flow (Supabase magic link + Luca session sync) — carried over from v1
- [x] Design tokens matching Tessio/Genco family
- [x] MCP server code written (`server/src/index.ts`) — 10 tools (4 write, 6 read)
- [x] Claude skill definition (`claude-skill.md`)

## What's Next (in priority order)

### 1. Deploy MCP Server to Railway
- The server code is at `server/src/index.ts`
- Needs env vars on Railway: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `OWNER_USER_ID`, `ANTHROPIC_API_KEY`, `PORT`
- Get the service role key from Supabase Dashboard > Settings > API > service_role
- Get your user ID by checking the `auth.users` table or the Supabase Auth dashboard
- Test: `curl https://<railway-url>/health`

### 2. Connect Claude.ai to MCP
- Add the Railway SSE endpoint to Claude.ai as an MCP server
- Add the skill definition from `claude-skill.md` to your Claude.ai project instructions
- Test: tell Claude "I just had coffee with [name]" and verify it calls `apollonia_add_contact` or `apollonia_log_interaction`

### 3. Add localhost redirect for local dev
- Supabase Dashboard > Authentication > URL Configuration
- Add `http://localhost:5174/**` to redirect URLs
- Then you can sign in and test locally

### 4. UI Polish Pass
- Global search (Cmd+K) — wire up actual Supabase queries (currently just a shell)
- Mobile bottom nav (header nav is hidden on mobile, needs an alternative)
- Loading skeletons instead of "Loading..." text
- Error handling/toast notifications
- Empty states with illustrations

### 5. Phase 1: Core Intelligence
- Health scoring cron (Supabase Edge Function + pg_cron or scheduled task)
- Relationship summary rewrite (call Claude after each interaction log)
- Contact briefing AI endpoint (for the Meeting Prep view)
- Outreach draft generation
- Wire voice samples into draft prompts

### 6. Phase 2: Data Ingestion
- LinkedIn CSV import (connections.csv parser)
- Tiering wizard (UI is built, needs import flow wired up)
- Gmail OAuth + thread import
- Granola MCP integration
- iMessage export CLI tool

### 7. Cleanup
- Remove old server code (Hono, Drizzle, old routes) — `server/` has been rewritten but old deps remain in node_modules
- Remove old `dist/` directory
- Update `.gitignore` if needed
- Run `npm install` in `server/` to clean up deps after package.json was updated

---

## Key Files

| File | Purpose |
|------|---------|
| `PLANNING.md` | Full architecture doc with all 11 deliverables |
| `supabase/migrations/001_initial_schema.sql` | Schema (already deployed) |
| `server/src/index.ts` | MCP server (ready to deploy) |
| `claude-skill.md` | System prompt for Claude.ai |
| `src/views/` | All 11 frontend views |
| `src/composables/` | 5 composables (auth, contacts, dashboard, interactions, notes) |
| `.env.local` | Supabase credentials (existing project) |
