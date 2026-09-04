-- 0010 — ai_calls: наблюдаемость AI-слоя (мастер-ТЗ §8).
create table if not exists public.ai_calls (
  id                uuid primary key default gen_random_uuid(),
  touchpoint        text not null,          -- 'proposal' | 'brief' | 'project-card'
  model             text,
  prompt_tokens     int,
  completion_tokens int,
  total_tokens      int,
  cost_usd          numeric(10,6),
  latency_ms        int,
  ok                boolean not null default true,
  error             text,
  created_at        timestamptz not null default now()
);
create index if not exists ai_calls_created_idx on public.ai_calls (created_at desc);
alter table public.ai_calls enable row level security;
