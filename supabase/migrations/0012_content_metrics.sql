-- 0012 — Метрики контента и рубрика (ПРОМПТ-3 §1.7). Только аддитивно.

-- Окно сбора инсайтов: '24h' (через сутки) и '7d' (через неделю).
alter table public.content_metrics add column if not exists window text;

-- Один замер на публикацию в каждом окне — чтобы сбор был идемпотентным (upsert).
create unique index if not exists content_metrics_pub_window
  on public.content_metrics (publication_id, window);

-- Рубрика поста (Разбор/Радар/Цена вопроса/Кейс/Вайбкодинг) — для медианы по рубрике.
alter table public.content_posts add column if not exists rubric text;
