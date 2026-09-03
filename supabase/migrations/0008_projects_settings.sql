-- 0008 — Admin CRUD: projects (portfolio) + settings (key-value).
-- RLS on, no policies (service-role only), same as the rest.

create table if not exists public.projects (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique,
  title       text not null,
  category    text not null default 'web',   -- web|mobile|ai|automation
  description text,
  image       text,                          -- /projects/x.jpg or URL
  technologies jsonb not null default '[]'::jsonb,
  year        int,
  url         text,
  published   boolean not null default true,
  sort        int not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
alter table public.projects enable row level security;

create table if not exists public.settings (
  key        text primary key,
  value      jsonb not null,
  updated_at timestamptz not null default now()
);
alter table public.settings enable row level security;

insert into public.settings (key, value) values
  ('fx_rate', '12000'::jsonb)
on conflict (key) do nothing;

-- Seed portfolio from the code catalog (id-stable via slug).
insert into public.projects (slug, title, category, description, image, technologies, year, url, sort) values
  ('tgpg', 'TGPG.UZ', 'web', 'Корпоративный сайт инжиниринговой компании: газовая инфраструктура, каталог труб и техники, 13 реализованных объектов, три языка и CMS.', '/projects/tgpg.jpg', '["Next.js","TypeScript","Tailwind CSS","CMS"]'::jsonb, 2026, 'https://tgpg.uz', 1),
  ('salomtv', 'Salom TV', 'web', 'Онлайн-кинотеатр с эксклюзивами, сериалами и ТВ-каналами: подписки, профили и просмотр на любом устройстве.', '/projects/salomtv.jpg', '["React","Node.js","HLS-стриминг","PostgreSQL"]'::jsonb, 2025, 'https://salomtv.uz', 2)
on conflict (slug) do nothing;
