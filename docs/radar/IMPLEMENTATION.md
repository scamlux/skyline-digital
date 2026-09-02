# Radar — движок сканирования лидов (Phase B)

Обновлено: 2026-09-03. Спека — исходный промпт Phase B; решения — `docs/adr/0002-radar-engine.md`.

## Что это

Находит компании (стоматология / автосервис / салоны красоты) в UZ, замеряет их
веб-присутствие, ставит оценку A/B/C и складывает в `radar_companies` для
холодного аутрича. Управление — `/admin/radar`.

## Архитектура

```
6 коллекторов ──► dedupe ──► enrich (сайт) ──► score (A/B/C) ──► upsert(phone) ──► radar_companies
   │                                                                                    ▲
   ├ google  (Places API)   надёжно, нужен GOOGLE_MAPS_API_KEY                          │
   ├ yandex  (Search API)   надёжно, нужен YANDEX_MAPS_API_KEY                    radar_runs (аудит)
   ├ yellowpages (Puppeteer) SPA — селекторы под доводку
   ├ gigal / olx / 2gis     (Puppeteer) — best-effort, анти-бот/скрытые телефоны
```

Код: `src/lib/radar/` — `types`, `validate`, `dedupe`, `signals`, `score`,
`store`, `orchestrate`, `factory`, `db`, `collectors/*`. CLI: `scripts/radar/`.
Админка: `src/app/admin/radar/`.

## Скоринг (два слоя, детерминирован)

**Слой 1 — качество веб-присутствия (0–100):** сайт доступен 40 · email 20 ·
соцсети 15 · CTA/аналитика 10 · возраст домена ≥2л 10 · HTTPS 5.

**Слой 2 — продажный грейд (мы продаём сайты, поэтому наоборот):**

| Грейд | Смысл | Правило |
|---|---|---|
| **A — горячие** | есть телефон/Telegram, но НЕТ работающего сайта и тг-бота | идеальный клиент «вам нужен сайт» |
| **B — тёплые** | контакт есть, сайт есть, но слабый (<70 из 100) | кандидат на редизайн |
| **C — холодные** | сильный сайт (≥70) или недозвониться | низкий приоритет |

Чистые функции (без сети/времени) → повторные прогоны идентичны. После смены
логики грейдов: `npm run radar -- --rescore` (переграничивает из сохранённых
сигналов, без API-квоты).


## Дедупликация

Телефон (последние 10 цифр) — сильный ключ. При отсутствии телефона: то же
первое слово имени **и** Левенштейн ≤ 1 **и** разница длины ≤ 3 **и** совпадение
города. Мягкое слияние: непустые поля + объединение соцсетей; приоритет источника
API > скрапперы.

## База данных

`radar_companies` (эволюция 0005 миграцией 0006): + `grade`, `source`, `region`,
`name_normalized`, `website`, `email`, `social_links`, `signals`, `web_status`,
`geo`, `verified_at`, `discarded`, `discard_reason`; `UNIQUE(phone)`. `radar_runs`
— аудит прогонов. RLS включён, политик нет (только service role).

## Запуск

```bash
# env: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
#      GOOGLE_MAPS_API_KEY, YANDEX_MAPS_API_KEY (для API-коллекторов)
npm run radar -- --help
npm run radar -- --industry dentistry --dry-run   # без записи в БД
npm run radar -- --collector google --industry beauty
npm run radar -- --all                             # все источники × отрасли
npm run radar -- --stats                           # счётчики из БД
scripts/radar/run.sh --all                         # враппер, подхватывает .env
```

Идемпотентно: повторный прогон = те же строки (меняются только `updated_at` /
`verified_at`). Мягкое удаление — флаг `discarded`.

## Админка `/admin/radar`

За HTTP Basic Auth (`ADMIN_USER` / `ADMIN_PASSWORD`; без них — 503). Дашборд
(Всего / A / B / C + разбивка по отраслям), таблица с фильтрами (отрасль/оценка/
источник/город/поиск) через URL-параметры, пагинация по 50, drawer по клику,
«Перепроверить сайт» и «Отбраковать».

## Статус источников (важно)

- **google / yandex** — рабочие и надёжные, но требуют API-ключей (env). Это
  основной путь к 150+ лидам.
- **yellowpages / gigal / olx / 2gis** — Puppeteer-скрапперы реализованы, но это
  JS-SPA: селекторы/URL требуют доводки под живую разметку. OLX прячет телефоны
  за кнопкой; 2gis блокирует IP датацентра (нужен резидентный IP / машина
  владельца). Это «best-effort» дополнение, не основной источник.
