-- 0013 — Конвейер заказов (docs/adr/0004-opportunity-pipeline.md).
--
-- opportunities — все найденные возможности (тендеры, [Hiring]-посты, заказы
-- из Telegram, письма-оповещения). Ключ дедупликации — (source, external_id);
-- fingerprint ловит один и тот же заказ из разных источников.
-- Доступ только через service role: RLS включён, политик нет (как leads).

create table if not exists public.opportunities (
  id             uuid primary key default gen_random_uuid(),
  source         text not null,
  external_id    text not null,
  url            text,
  title          text not null,
  description    text not null default '',
  buyer          text,
  country        text,
  budget_min     numeric,
  budget_max     numeric,
  currency       text,
  deadline       timestamptz,
  published_at   timestamptz,
  tags           text[],
  fingerprint    text not null,
  status         text not null default 'new',
  score          int,
  prefilter      jsonb,
  qualification  jsonb,
  quote          jsonb,
  draft          jsonb,
  tg_message_id  bigint,
  notified_at    timestamptz,
  decided_at     timestamptz,
  lead_id        uuid references public.leads(id) on delete set null,
  notes          text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (source, external_id)
);

do $$ begin
  alter table public.opportunities add constraint opportunities_status_chk
    check (status in ('new','filtered','rejected','review','applying','submitted','won','lost','dismissed','expired'));
exception when duplicate_object then null; end $$;

create index if not exists opportunities_status_idx on public.opportunities (status, created_at desc);
create index if not exists opportunities_fingerprint_idx on public.opportunities (fingerprint);
create index if not exists opportunities_score_idx on public.opportunities (score desc nulls last);

drop trigger if exists trg_opportunities_updated_at on public.opportunities;
create trigger trg_opportunities_updated_at before update on public.opportunities
  for each row execute function public.touch_updated_at();

-- Журнал прогонов: сколько собрано по источникам, ошибки источников. Нужен
-- и для троттлинга (не чаще PIPELINE_INTERVAL_MIN), и чтобы видеть, что
-- источник молча сломался.
create table if not exists public.pipeline_runs (
  id           uuid primary key default gen_random_uuid(),
  trigger      text not null default 'cron',   -- cron | manual | ingest
  started_at   timestamptz not null default now(),
  finished_at  timestamptz,
  stats        jsonb,
  errors       jsonb
);
create index if not exists pipeline_runs_started_idx on public.pipeline_runs (started_at desc);

-- Рутины профилей: какой период уже отправлен (одно напоминание на период).
create table if not exists public.pipeline_routine_runs (
  key      text primary key,          -- '<routine_id>:<period>'
  sent_at  timestamptz not null default now()
);

alter table public.opportunities enable row level security;
alter table public.pipeline_runs enable row level security;
alter table public.pipeline_routine_runs enable row level security;
