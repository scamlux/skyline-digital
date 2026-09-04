-- 0009 — Студия контента (docs/TZ-CONTENT-STUDIO.md §4).
-- RLS включён на всех таблицах, политик нет — только service role.

create table if not exists public.content_posts (
  id           uuid primary key default gen_random_uuid(),
  slug         text unique not null,
  title        text not null,
  style        text not null default 'studio',
  format       text not null default 'post',
  status       text not null default 'draft',
  platforms    text[] not null default '{}',
  scheduled_at timestamptz,
  spec         jsonb not null,
  caption      jsonb not null default '{}'::jsonb,
  hashtags     text[] not null default '{}',
  spec_hash    text,
  guard        jsonb not null default '[]'::jsonb,
  notes        text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists content_posts_status_idx on public.content_posts (status);
create index if not exists content_posts_scheduled_idx on public.content_posts (scheduled_at);

create or replace function public.touch_updated_at() returns trigger as $$
begin new.updated_at := now(); return new; end $$ language plpgsql;
drop trigger if exists content_posts_touch on public.content_posts;
create trigger content_posts_touch before update on public.content_posts
  for each row execute function public.touch_updated_at();

create table if not exists public.content_renders (
  id           uuid primary key default gen_random_uuid(),
  post_id      uuid not null references public.content_posts(id) on delete cascade,
  slide_index  int not null,
  storage_path text not null,
  width        int not null,
  height       int not null,
  bytes        int not null,
  spec_hash    text not null,
  created_at   timestamptz not null default now(),
  unique (post_id, slide_index, spec_hash)
);

create table if not exists public.content_publications (
  id           uuid primary key default gen_random_uuid(),
  post_id      uuid not null references public.content_posts(id) on delete cascade,
  platform     text not null,
  status       text not null default 'pending',
  external_id  text,
  permalink    text,
  error        text,
  published_at timestamptz,
  created_at   timestamptz not null default now()
);
-- Защита от повторной публикации на уровне БД.
create unique index if not exists content_pub_once
  on public.content_publications (post_id, platform) where status = 'published';

create table if not exists public.content_metrics (
  id             uuid primary key default gen_random_uuid(),
  publication_id uuid not null references public.content_publications(id) on delete cascade,
  collected_at   timestamptz not null default now(),
  views int, likes int, comments int, saves int, shares int,
  profile_clicks int, link_clicks int
);

alter table public.content_posts enable row level security;
alter table public.content_renders enable row level security;
alter table public.content_publications enable row level security;
alter table public.content_metrics enable row level security;

-- Storage-бакет для PNG (приватный, как proposals).
insert into storage.buckets (id, name, public)
values ('content', 'content', false)
on conflict (id) do nothing;
