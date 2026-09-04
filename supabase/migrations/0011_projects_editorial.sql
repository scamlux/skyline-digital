-- 0011 — Детальная страница проекта (§5 ТЗ): редакторские поля.
-- Все колонки NULLABLE — старые проекты и code-фолбэк продолжают работать.
-- Портфолио одноязычное (как title/description в 0008); §6 i18n отложено
-- осознанно — см. docs/DESIGN-GAPS.md.

alter table public.projects
  add column if not exists client   text,
  add column if not exists role     text,
  add column if not exists brief    text,   -- Задача
  add column if not exists solution text,   -- Решение
  add column if not exists result   text,   -- Результат
  add column if not exists metrics  jsonb not null default '[]'::jsonb,  -- [{value,label}]
  add column if not exists gallery  jsonb not null default '[]'::jsonb;  -- ["/path.jpg", ...]

-- Демо-наполнение эталонного кейса, чтобы деталка сразу была живой.
update public.projects set
  client   = 'TGPG Engineering',
  role     = 'Дизайн, разработка, CMS, запуск',
  brief    = 'Инжиниринговой компании нужен был корпоративный сайт: каталог труб и техники, витрина реализованных объектов и приём заявок — на трёх языках, с самостоятельным управлением контентом.',
  solution = 'Спроектировали структуру под каталог и объекты, собрали сайт на Next.js с CMS, настроили три языка и приём заявок в Telegram. Дизайн — в фирменном стиле, адаптив под мобильные.',
  result   = 'Заявки приходят напрямую в Telegram, контент компания правит сама без разработчика, сайт индексируется на трёх языках.',
  metrics  = '[{"value":"3","label":"языка"},{"value":"13","label":"объектов в портфолио"},{"value":"CMS","label":"контент без разработчика"}]'::jsonb
where slug = 'tgpg';
