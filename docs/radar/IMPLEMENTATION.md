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

## Скоринг (100 баллов, детерминирован)

| Сигнал | Баллы |
|---|---|
| Сайт доступен | 40 |
| Найден email | 20 |
| Соцсети | 15 |
| CTA / аналитика | 10 |
| Возраст домена ≥ 2 лет | 10 |
| HTTPS | 5 |

Грейд: **A ≥ 70**, **B 40–69**, **C < 40**. Скоринг — чистая функция сигналов
(без сети/времени/рандома), сеть собирается в отдельном timeout-safe шаге.

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
