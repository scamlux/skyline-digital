-- 0006 — Radar Phase B: evolve radar_companies + add radar_runs.
--
-- radar_companies was created in 0005 with a lighter shape (class/directory/
-- has_site). Phase B enriches it with scored web-presence signals and a soft-
-- delete flag, and enforces phone uniqueness for idempotent upserts. The old
-- columns (class, directory) are kept for backward compatibility; the store
-- writes both the new (grade, source) and the legacy names.
--
-- RLS stays enabled with NO policies on both tables — service-role-only access,
-- exactly like audits/leads/proposals.

-- ── radar_companies: new Phase B columns ───────────────────────────────────
alter table public.radar_companies
  add column if not exists grade          text,        -- 'A' | 'B' | 'C'
  add column if not exists source         text,        -- 'pc'|'olx'|'gigal'|'yellowpages'|'2gis'
  add column if not exists website        text,        -- full resolved URL (domain is just the host)
  add column if not exists email          text,
  add column if not exists social_links   jsonb not null default '[]'::jsonb,
  add column if not exists signals        jsonb,       -- {hasWebsite,hasEmail,hasSocial,hasCta,domainAgeYears,responsive}
  add column if not exists web_status     text,        -- 'ok'|'timeout'|'unreachable'|'no_site'|'error'
  add column if not exists geo            jsonb,       -- {lat,lng} when available (2gis)
  add column if not exists verified_at    timestamptz,
  add column if not exists discarded      boolean not null default false,
  add column if not exists discard_reason text;

-- `directory` was NOT NULL in 0005; new inserts key on `source` instead.
alter table public.radar_companies alter column directory drop not null;

-- Idempotent upserts key on phone. Table is empty (Phase B hasn't run), so the
-- unique constraint is safe to add now. NULL phones remain allowed (multiple).
create unique index if not exists radar_companies_phone_key
  on public.radar_companies (phone) where phone is not null;

create index if not exists radar_companies_grade_industry_idx
  on public.radar_companies (grade, industry) where discarded = false;
create index if not exists radar_companies_source_idx
  on public.radar_companies (source, created_at desc);

-- ── radar_runs: one row per collector×industry execution ───────────────────
create table if not exists public.radar_runs (
  id                 uuid primary key default gen_random_uuid(),
  industry           text,
  source             text,
  status             text not null default 'running',  -- running | success | failed
  companies_found    int  not null default 0,
  companies_new      int  not null default 0,
  companies_updated  int  not null default 0,
  error_message      text,
  started_at         timestamptz not null default now(),
  ended_at           timestamptz
);
create index if not exists radar_runs_started_idx on public.radar_runs (started_at desc);

alter table public.radar_runs enable row level security;
-- radar_companies already has RLS enabled from 0005; keep it hermetic.
