-- 0005 — Audit engine + radar storage (docs/TZ-AUDIT-ENGINE.md §8).
--
-- RLS is enabled on both tables with NO policies: access is only through the
-- service role (src/lib/supabase/server.ts), exactly like `leads` and
-- `proposals`. `radar_companies` holds contacts of businesses scraped from
-- public directories — those are never exposed via any public API or /web-index.

create table public.audits (
  id            uuid primary key default gen_random_uuid(),
  url           text not null,
  host          text not null,
  final_url     text,
  reachable     boolean not null default true,
  error_code    text,
  score_total   int,
  score_grade   text,
  categories    jsonb,          -- CategoryScore for the four categories
  measurement   jsonb not null, -- full Measurement
  findings      jsonb,          -- Finding[]
  email         text,           -- set only when a report is requested
  lead_id       uuid references public.leads(id) on delete set null,
  source        text,           -- 'public' | 'radar'
  created_at    timestamptz not null default now()
);
create index audits_host_created_idx on public.audits (host, created_at desc);
create index audits_source_idx on public.audits (source, created_at desc);

create table public.radar_companies (
  id              uuid primary key default gen_random_uuid(),
  domain          text unique,           -- null when there is no site
  name            text not null,
  industry        text,
  city            text,
  phone           text,
  instagram       text,
  directory       text not null,         -- source directory
  directory_url   text,
  has_site        boolean not null default false,
  class           text,                  -- 'S' | 'A' | 'B' | 'C'
  last_audit_id   uuid references public.audits(id) on delete set null,
  outreach_status text not null default 'NEW',  -- NEW | QUEUED | SENT | REPLIED | WON | SKIP
  outreach_at     timestamptz,
  notes           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index radar_class_status_idx on public.radar_companies (class, outreach_status);

-- Hermetic by default: enabled, zero policies → anon/authenticated see nothing,
-- service role bypasses RLS.
alter table public.audits enable row level security;
alter table public.radar_companies enable row level security;
