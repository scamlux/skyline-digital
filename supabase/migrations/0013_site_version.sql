-- 0013 — Вариант публичного сайта и акцент бренда (docs/plan-site-versions.md, ADR 0005).
-- Значения jsonb-строками; читает src/lib/site/active.ts, пишет только админка
-- через service role (RLS на settings уже включён, политик не добавляем).
-- Идемпотентно: существующие значения не перезаписываются.

insert into public.settings (key, value) values
  ('site_version', '"old"'::jsonb),       -- old | studio | ref
  ('brand_accent', '"dark-blue"'::jsonb)  -- dark-blue | burgundy | khaki | dark-green | brass
on conflict (key) do nothing;
