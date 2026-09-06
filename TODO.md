# TODO — Skyline Digital

Трекер статуса и разрывов с ТЗ. Полный разбор — в [`docs/AUDIT.md`](docs/AUDIT.md).
Легенда: ✅ готово · 🟡 частично · ⬜ не начато · 🔴 разрыв с ТЗ (нужно решение владельца).

## Готово ✅
- Трёхъязычный сайт (ru/en/uz), все публичные страницы, i18n полный (262/262 ключа).
- Детерминированный движок цен + живой предпросчёт в визарде (⚠️ формула ≠ §7, см. ниже).
- AI-генерация текста КП (⚠️ на OpenAI, не Anthropic).
- Пайплайн PDF (Puppeteer), шаблон КП — все 8 полос + рыночная дельта.
- Supabase + RLS (герметичность проверена от анонимной роли), деплой на Vercel, домен skyline-digital.uz.
- Лид-система: лиды и КП → Supabase + Telegram; лид не теряется при сбоях.
- SEO: sitemap/robots/OG/hreflang/canonical; reduced-motion.

## Безопасность до запуска (дёшево, высокий риск) 🔴
- [x] Капча на последний шаг визарда и контакт-форму (Cloudflare Turnstile) — §11. Работает после установки `NEXT_PUBLIC_TURNSTILE_SITE_KEY` / `TURNSTILE_SECRET_KEY` в Vercel.
- [ ] Токен сметы 32+ символов (сейчас 16) — §11.
- [x] Приватный бакет `proposals` + signed URL — §11. Код готов; закрывает бакет миграция `0004`, применять её ТОЛЬКО после деплоя.
- [x] Распределённый rate-limit на Upstash Redis (in-memory остался фолбэком) — §11. Работает после подключения Upstash в Vercel.
- [ ] Глобальный `:focus-visible` — §12 a11y.
- [ ] **Измерить гейты §12** (пока НЕ проверялись): Lighthouse ≥90 на главной/`/projects/[slug]`/`/calculator`, LCP ≤2.5с (4G), CLS ≤0.1, iOS Safari + Android Chrome на реальных устройствах.

## Стек-решения (нужен ADR + сайн-офф владельца) 🔴
- [ ] AI: OpenAI → Anthropic `claude-sonnet-4-6` (§2/§8) — либо официально принять OpenAI.
- [ ] 3D (§3): реализовать R3F-hero — либо ADR о понижении до CSS.
- [ ] `@supabase/ssr` (нужен для Auth админки), React Hook Form, Prettier — §2.

## Движок цен под §7 (после подтверждения цифр прайса) 🔴
- [ ] Вилка `×0.9 / ×1.15` (сейчас ±12%); опции `percent`/`per_unit`; недели `ceil((base_days+Σdays)/5)±1`.
- [ ] Таблицы `services`/`service_options`/`settings`, засев 6 услуг / 12 опций §7.
- [ ] `settings.fx_rate` (сейчас 12000 захардкожен); UZS из движка.
- [ ] `price_snapshot` в смете (иммутабельность выданных смет).
- [ ] Vitest на денежную логику — прежде чем менять формулы (§7/§10).

## Контентная половина (крупно) ✅
- [x] Админка `/admin/*` (Basic-Auth, 8 разделов CRUD) — сделано 2026-09.
- [x] Таблица `projects` + портфолио на БД; ISR + черновики — сделано 2026-09.
- [x] Детальная страница проекта: метрики, задача→решение→результат, галерея/лайтбокс, next/prev — сделано 2026-09 (миграция 0011, `/projects/[slug]`).
- [x] AI-предзаполнение карточек (touchpoint C §8) — сделано 2026-09 (Server Action `prefillProject`, бейджи «ИИ»).
- [x] `/services/[slug]` (состав, цена от, кейсы, FAQ) — сделано 2026-09.

## Наблюдаемость / AI-слой ✅
- [x] Таблица `ai_calls` (модель/токены/латентность/стоимость) — §8 — миграция 0010 применена в прод.
- [x] Touchpoint A: разбор free-text в JSON (scope/option-keys/questions/risks) — §8 — `parseBrief` + блок «Разобрать описание с ИИ» в визарде.
- [x] Валидатор чисел после ответа модели; 30-сек таймаут + backoff — §8 — `withAiGuards` + `enforceEngineNumbers`.
- [x] JSON-LD на `/services` — §12 — Service schema на `/services/[slug]`.

## Мелкие отклонения КП ✅
- [x] Слайд 3: превью дизайна вместо «понимания»; кремовый `#FFE4CC`; статусы чек-листа из данных — сделано 2026-09.

## Управление постингом из /admin/content (ПРОМПТ-3)
- [x] **1.1 Крон + TZ.** `vercel.json` cron `*/15`, `src/lib/content/tz.ts` (toTashkent/fromTashkent, UTC+5 без DST), исправлен `slice(0,16)` в page/Editor/calendar, `CRON_SECRET` в `.env.example`. Тесты tz — зелёные.
- [x] **1.2 Диагностика площадок.** `diagnostics.ts` (предикаты для крона) + блок «Диагностика» вверху /admin/content.
- [x] **1.3 Импорт плана.** import-plan.ts (маппинг по типам + идемпотентный upsert, не трогает approved/scheduled/published), кнопка «Импорт плана» + отчёт, scripts/content/import-plan.mjs (--dry). 16/16 постов валидны. Тесты — зелёные.
- [ ] **1.6 QA-гейт.** guard.ts: цены из brain.md (ERROR на `от $N` вне {840,1000,1130,1680,2080,2590}), пустая подпись/нет вопроса/нет призыва-в-комментарии/хэштеги/слайды 1–10; warnings (TG>1024, последний слайд не cta, нет alt). Кнопка «Одобрить» дизейбл при error. Инвариант: все 13 ready проходят без ошибок.
- [ ] **1.4 Instagram.** `publish-instagram.ts` (контейнер→публикация, карусель ≤10, JPEG q92 нативным puppeteer, STORIES), TTL signed URL ≥1800.
- [ ] **1.5 Ручные напоминания.** статус `manual`; крон для facebook/linkedin/threads шлёт напоминание в чат лидов; кнопка «Опубликовано вручную».
- [ ] **1.7 Метрики.** сбор IG insights 24ч/7д → content_metrics; вкладка /admin/content/metrics с медианой по рубрике; миграция 0012 (окно сбора).

_Верификация: pure-части (tz, импорт, guard) — vitest. End-to-end приёмка требует живых Supabase/Telegram/Meta/Vercel cron — здесь не воспроизводится._
