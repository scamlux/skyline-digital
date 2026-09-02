# Radar — тестирование

## Юнит-тесты (`npm test`)

Покрыто (все зелёные):
- `score.test.ts` — 100-балльная модель, пороги A/B/C, детерминизм (10×).
- `validate.test.ts` — нормализация UZ-телефонов/сайтов/email.
- `dedupe.test.ts` — Левенштейн, строгие правила дубля, слияние 5→1.
- `signals.test.ts` — извлечение email/соц/CTA/аналитики, enrich ok/no_site/timeout.
- `store.test.ts` — счёт new/updated, skip без телефона, идемпотентность.
- `collectors/api.test.ts` — Google/Yandex: skip без ключа, парсинг + geo.
- `collectors/robots.test.ts` — парсинг robots.txt, выбор UA-группы, Disallow.

## Ручная проверка

```bash
# 1. Dry-run без ключей (пайплайн работает, коллекторы пропускаются)
npm run radar -- --industry dentistry --dry-run

# 2. С API-ключами (реальный сбор)
GOOGLE_MAPS_API_KEY=... YANDEX_MAPS_API_KEY=... \
  npm run radar -- --collector google --industry dentistry

# 3. Скраппер вживую (нужен локальный Chrome)
CHROME_EXECUTABLE_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  npm run radar -- --collector olx --industry beauty --dry-run

# 4. Полный прогон + статистика
npm run radar -- --all
npm run radar -- --stats
```

## Идемпотентность

Запустить `--all` дважды: во второй раз `new=0`, все `updated`, число строк в БД
не растёт (ключ — `phone`). Проверяется юнит-тестом `store.test.ts`.

## Админка

1. Задать `ADMIN_USER` / `ADMIN_PASSWORD` в env (иначе `/admin` → 503).
2. Открыть `/admin/radar` → Basic Auth → дашборд + таблица.
3. Фильтры (отрасль/оценка/источник/город/поиск) меняют URL и сохраняются при
   перезагрузке; пагинация по 50; клик по строке → drawer; «Отбраковать» скрывает.

## Известные ограничения

- API-коллекторы без ключей возвращают пустой результат (blocked) — это ок.
- Скрапперы (yellowpages/gigal/olx/2gis) — best-effort: под живую разметку SPA
  селекторы требуют доводки; 2gis блокирует IP датацентра.
