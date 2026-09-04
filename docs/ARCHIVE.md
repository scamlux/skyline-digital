# ARCHIVE — всё выполненное (сводка поглощённых документов)

> Обновлено: 2026-09-04. Один файл вместо ~30 закрытых .md. Полные тексты
> оригиналов — в git-истории (удалены коммитом с этим файлом). Открытые хвосты
> живут в `TODO.md` и `docs/DESIGN-GAPS.md`.

## Что построено (хронология крупных блоков)

1. **Сайт-портфолио** (по `PLAN.md`/`SPEC.md`, реализовано): Next.js 16 + Tailwind v4,
   3 локали (ru/en/uz), дизайн-система «Horizon over Tashkent», страницы
   главная/услуги/проекты/о нас/контакты, SEO (sitemap/robots/OG/hreflang), деплой
   Vercel + домен skyline-digital.uz (DNS aHost, A → 216.198.79.1).
2. **Калькулятор смет + КП**: открытая юнит-экономика (часы×ставки 6 ролей,
   spec `superpowers/2026-09-01`), детерминированный движок цен (код, не AI),
   AI-текст КП, PDF (Puppeteer, ADR-0001), 8 полос с рыночной дельтой; рестайл
   КП: понятная схема системы, стек, «цена без скидки», округления, карточка
   контактов; курс UZS — из `settings.fx_rate` (админка «Прайс»).
3. **Аудит-движок (Phase A, `TZ-AUDIT-ENGINE.md` выполнено)**: SSRF-guard
   (DNS-резолв, приватные диапазоны, редиректы), замер CDP+PerformanceObserver
   без Lighthouse, скоринг 4 категорий, `/audit` (3 локали) + rate-limit +
   Turnstile, лид-магнит в навигации, «Скачать отчёт» (self-contained HTML→PDF).
   Приёмка §11 пройдена вживую; LCP /audit 0.39с (шторка отключена на роуте).
4. **Сайт до 100/A**: SEO 55→100 (title/description/alt), Security 85→100
   (HSTS/CSP/XFO/XCTO), Mobile 85→100 (тап-таргеты) — замерено собственным движком.
5. **Радар (Phase B)**: Google Places (основной) + Geoapify (+3 скраппера
   best-effort; Яндекс платный — 195k ₽/год, отказ), продажная градация
   A=контакт-без-сайта, строгий дедуп по телефону, идемпотентный store,
   динамические отрасли (`radar_queries`, 18 шт.), CLI (`npm run radar`,
   --all/--rescore/--relabel/--stats), **6 132 компании (A≈5 038)**.
   Ключевые ADR-решения (были в `adr/0002-radar-engine.md`): скоринг чист от
   сети; robots.txt уважается; исходящий троттлинг свой.
6. **Единая админка `/admin`** (Basic-Auth: proxy.ts): Обзор с чартами, Заявки
   (CRUD), Сметы/Аудиты (удаление), Радар (запуск сбора кнопкой, фильтры,
   правка, отбраковка, параметры отраслей), Проекты (портфолио в БД + ISR на
   сайт), Прайс (каталог движка + fx_rate), Настройки (kv).
7. **Телефон-гейт**: скачивание отчёта аудита и КП требует валидный +998
   (масочное поле, сервер-валидация, номер в лид).
8. **Прод-гигиена**: деплой-чеки Vercel (Lint/Typecheck) зелёные, analytics +
   speed-insights, allowScripts, git вычищен (битые refs/ветки/worktrees).

## Ключевые решения из удалённых ADR

- **0001**: PDF — Puppeteer/chromium-min (пиксельная точность КП), не @react-pdf.
- **0002-stack**: отклонения от §2 ТЗ (без R3F/Framer — CSS-анимации; см. DESIGN-GAPS).
- **0003**: AI-провайдер OpenAI вместо Anthropic (решение зафиксировано, в
  TODO остаётся пункт о возможной миграции).
- **0002-radar**: см. блок 5 выше.

## Поглощённые файлы (полный текст — в git-истории)

PLAN.md · SPEC.md · skyline-prod-plan.md · docs/AUDIT.md ·
docs/AUDIT-SITE-2026-09.md (открытые P0/P1 → TODO.md) · docs/TZ-AUDIT-ENGINE.md ·
docs/adr/{README,0001,0002-stack,0002-radar,0003} · docs/prompts/{build-audit-engine,
verify-turnstile-upstash} · docs/superpowers/specs/2026-09-01-open-unit-economics ·
docs/radar/{IMPLEMENTATION,TESTING} (команды CLI — в блоке 5) · Notion-экспорты
второго мозга (Overview, Architecture, Database, Deployment, Security, Roadmap,
Portfolio, i18n, AI Layer, Animations and Motion, Calculator Flow, Design System,
Environment Variables, PDF Generation, Pages and Routes, Pricing Engine, Project
Structure, Tech Stack, 🏠 Home) — актуальные версии живут в `~/Desktop/Документации/skyline-digital/`.
