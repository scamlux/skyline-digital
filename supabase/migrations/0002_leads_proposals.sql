-- Skyline Digital — lead handling system.
-- Extends `leads` into the full lead model, adds auto lead_number + updated_at,
-- creates `proposals` (versioned КП linked to a lead) and a Storage bucket for
-- proposal PDFs. All access stays server-side via the service role (RLS on,
-- no anon policies).

-- ————— Human-readable lead numbers: LEAD-2026-00001 —————
create sequence if not exists public.lead_number_seq;

-- ————— Extend leads with the full model —————
alter table public.leads alter column name drop not null;

alter table public.leads
  add column if not exists lead_number          text unique,
  add column if not exists updated_at           timestamptz not null default now(),
  add column if not exists client_name          text,
  add column if not exists company              text,
  add column if not exists phone                text,
  add column if not exists telegram             text,
  add column if not exists project_type         text,
  add column if not exists description          text,
  add column if not exists deadline             text,
  add column if not exists status               text not null default 'NEW',
  add column if not exists source               text,
  add column if not exists utm_source           text,
  add column if not exists utm_medium           text,
  add column if not exists utm_campaign         text,
  add column if not exists utm_content          text,
  add column if not exists landing_page         text,
  add column if not exists referrer             text,
  add column if not exists ai_summary           text,
  add column if not exists calculated_price     numeric,
  add column if not exists currency             text,
  add column if not exists proposal_id          uuid,
  add column if not exists telegram_message_id  bigint,
  add column if not exists telegram_error       text;

do $$ begin
  alter table public.leads add constraint leads_status_chk
    check (status in ('NEW','IN_PROGRESS','PROPOSAL_SENT','NEGOTIATION','WON','LOST'));
exception when duplicate_object then null; end $$;

-- Assign lead_number atomically on insert (unique regardless of concurrency).
create or replace function public.set_lead_number() returns trigger as $$
begin
  if new.lead_number is null then
    new.lead_number := 'LEAD-' || to_char(now(), 'YYYY') || '-' ||
      lpad(nextval('public.lead_number_seq')::text, 5, '0');
  end if;
  return new;
end $$ language plpgsql;

drop trigger if exists trg_set_lead_number on public.leads;
create trigger trg_set_lead_number before insert on public.leads
  for each row execute function public.set_lead_number();

create or replace function public.touch_updated_at() returns trigger as $$
begin new.updated_at := now(); return new; end $$ language plpgsql;

drop trigger if exists trg_leads_updated_at on public.leads;
create trigger trg_leads_updated_at before update on public.leads
  for each row execute function public.touch_updated_at();

-- ————— Proposals: versioned КП, always linked to a lead —————
create table if not exists public.proposals (
  id                  uuid primary key default gen_random_uuid(),
  lead_id             uuid not null references public.leads(id) on delete cascade,
  estimate_id         uuid references public.estimates(id) on delete set null,
  created_at          timestamptz not null default now(),
  version             int  not null default 1,
  title               text,
  content             jsonb,
  total_price         numeric,
  currency            text,
  valid_until         date,
  file_url            text,
  status              text not null default 'CREATED',
  telegram_message_id bigint,
  telegram_error      text,
  unique (lead_id, version)
);

do $$ begin
  alter table public.proposals add constraint proposals_status_chk
    check (status in ('CREATED','SENT','SEND_FAILED'));
exception when duplicate_object then null; end $$;

create index if not exists proposals_lead_idx      on public.proposals (lead_id);
create index if not exists proposals_estimate_idx  on public.proposals (estimate_id);
create index if not exists leads_lead_number_idx   on public.leads (lead_number);
create index if not exists leads_status_idx        on public.leads (status);

alter table public.proposals enable row level security;
-- No anon/authenticated policies: only the service role (server) may read/write.

-- ————— Storage: proposal PDFs (public; addressed by unguessable token) —————
insert into storage.buckets (id, name, public)
values ('proposals', 'proposals', true)
on conflict (id) do nothing;
