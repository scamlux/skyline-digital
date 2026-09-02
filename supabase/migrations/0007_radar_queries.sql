-- 0007 — Radar: dynamic query parameters + phone-upsert fix.
--
-- (1) The 0006 unique index on phone was partial (WHERE phone IS NOT NULL),
-- which PostgREST's ON CONFLICT (phone) cannot use — upserts silently failed.
-- A plain unique index allows multiple NULLs in Postgres anyway, so partiality
-- bought nothing. Recreate it full.
--
-- (2) radar_queries — industries/keywords/cities become data, editable from
-- the admin panel, instead of hardcoded collector maps. RLS on, no policies.

drop index if exists radar_companies_phone_key;
create unique index if not exists radar_companies_phone_key
  on public.radar_companies (phone);

create table if not exists public.radar_queries (
  id         uuid primary key default gen_random_uuid(),
  key        text not null unique,          -- slug: 'dentistry', 'auto', ...
  label      text not null,                 -- «Стоматология»
  keywords   jsonb not null default '[]'::jsonb,  -- search phrases (ru/en)
  cities     jsonb,                         -- null → default city list
  active     boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.radar_queries enable row level security;

insert into public.radar_queries (key, label, keywords) values
  ('dentistry', 'Стоматология', '["dental clinic","dentist","стоматология"]'::jsonb),
  ('auto',      'Автосервис',   '["auto service","car repair","автосервис"]'::jsonb),
  ('beauty',    'Салоны красоты','["beauty salon","hair salon","салон красоты"]'::jsonb)
on conflict (key) do nothing;

-- (3) 0005 made `domain` UNIQUE, but branches of one business legitimately
-- share a domain — upserts died on radar_companies_domain_key. Phone is the
-- real dedup key; drop the domain constraint.
alter table public.radar_companies drop constraint if exists radar_companies_domain_key;
