-- 0015 — Audit engine v2 (ADR 0009): versions, shareable report token, the
-- screenshot kept out of the row's JSON, radar batch linkage.
-- Additive only: every column is nullable / defaulted, old rows stay valid.

alter table public.audits
  -- Compare scores only within one engine/score version.
  add column if not exists engine_version text,
  add column if not exists score_version  text,
  -- Unguessable token for /[locale]/audit/r/<token> (noindex). 32 hex chars
  -- from gen_random_bytes; only set for reports that are meant to be shared.
  add column if not exists share_token    text,
  -- Data-URL of the mobile screenshot, stored apart from `measurement` so list
  -- queries never drag megabytes of base64.
  add column if not exists screenshot     text,
  -- Radar batch run that produced the row (null for public audits).
  add column if not exists batch_id       text;

create unique index if not exists audits_share_token_idx
  on public.audits (share_token) where share_token is not null;
create index if not exists audits_batch_idx
  on public.audits (batch_id) where batch_id is not null;

-- Latest audit per radar company and when it was taken (the batch CLI keeps
-- `last_audit_id` in sync; `last_audit_at` lets the CLI skip fresh ones).
alter table public.radar_companies
  add column if not exists last_audit_at timestamptz,
  add column if not exists audit_score   int,
  add column if not exists audit_grade   text;

-- RLS stays as in 0005: enabled, no policies (service-role only). The share
-- page reads through the server with the service role, by exact token.
