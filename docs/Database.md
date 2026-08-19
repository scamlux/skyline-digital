---
tags: [engineering]
---

# Database

**Supabase (PostgreSQL)**, two tables. Migration: `supabase/migrations/0001_init.sql`.
Accessed only server-side via the service-role client
(`src/lib/supabase/server.ts`), which bypasses RLS.

## Tables

```sql
leads (
  id uuid pk, name, email, messenger, service, budget, message,
  created_at timestamptz
)

estimates (
  id uuid pk, lead_id → leads(id),
  token text unique,          -- unguessable, used for the public link
  project_type text,
  configuration jsonb,        -- the ProjectConfiguration
  pricing_result jsonb,       -- snapshot from [[Pricing Engine]]
  ai_result jsonb,            -- the [[AI Layer]] Proposal
  created_at timestamptz
)
```

Indexes on `estimates.token`, `estimates.created_at`, `leads.created_at`.

## RLS

RLS is **enabled on both tables with no anon/authenticated policies** — so the
public anon key can neither read nor write. Everything goes through the server
using `SUPABASE_SERVICE_ROLE_KEY`. See [[Security]].

## Snapshotting

`estimates.pricing_result` stores the price at calculation time. Editing
`rules.ts` later never changes an already-issued estimate.

## Graceful degradation

`isSupabaseConfigured()` lets pages (e.g. `/estimate/[token]`) render a "not
found" state instead of crashing when env vars are absent.

Related: [[Environment Variables]] · [[Architecture]]
