-- Skyline Digital — initial schema
-- Tables: leads, estimates. All access is server-side via the service role,
-- which bypasses RLS. RLS is enabled with no anon/authenticated policies, so
-- the anon key cannot read or write these tables.

create extension if not exists pgcrypto;

-- Contact form submissions.
create table if not exists public.leads (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  email       text not null,
  messenger   text,
  service     text,
  budget      text,
  message     text,
  created_at  timestamptz not null default now()
);

-- Calculator results: deterministic pricing + AI proposal, addressable by token.
create table if not exists public.estimates (
  id              uuid primary key default gen_random_uuid(),
  lead_id         uuid references public.leads(id) on delete set null,
  token           text not null unique,
  project_type    text not null,
  configuration   jsonb not null,
  pricing_result  jsonb not null,
  ai_result       jsonb not null,
  created_at      timestamptz not null default now()
);

create index if not exists estimates_token_idx on public.estimates (token);
create index if not exists estimates_created_at_idx on public.estimates (created_at desc);
create index if not exists leads_created_at_idx on public.leads (created_at desc);

alter table public.leads enable row level security;
alter table public.estimates enable row level security;

-- No policies are defined intentionally: only the service role (server) may
-- read/write. Add explicit policies later if client-side access is needed.
