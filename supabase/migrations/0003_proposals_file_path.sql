-- 0003 — Prepare for a private `proposals` bucket (SEC3 in docs/AUDIT.md), part 1/2.
--
-- КП содержат контактные данные клиента, объём работ и цену. Публичный bucket
-- отдаёт их любому, кто угадал/получил ссылку, и такие ссылки живут вечно.
-- Теперь PDF отдаётся только по подписанной ссылке с коротким сроком жизни,
-- которую генерирует сервер (service role) по `file_path`.
--
-- Эта миграция безопасна на текущем (старом) коде: она только добавляет
-- колонку и заполняет её. Bucket закрывает следующая, 0004, — её применять
-- ТОЛЬКО после деплоя кода из этого коммита.

-- 1. Путь к файлу внутри bucket — источник истины вместо вечного публичного URL.
alter table public.proposals
  add column if not exists file_path text;

-- 2. Бэкфилл для уже созданных КП: вытаскиваем путь из публичного URL
--    (.../storage/v1/object/public/proposals/<path>?...).
update public.proposals
set file_path = split_part(
      substring(file_url from '/proposals/(.*)$'),
      '?', 1
    )
where file_path is null
  and file_url is not null
  and file_url like '%/proposals/%';
