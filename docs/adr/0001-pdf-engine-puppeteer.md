# 0001 — PDF-движок: Puppeteer вместо @react-pdf/renderer

**Статус:** accepted · **Дата:** 2026-08-20 (записано задним числом)

## Контекст
§2/§9 ТЗ разрешают выбрать PDF-движок самому и просят обосновать в ADR: `@react-pdf/renderer` **либо** Playwright/Chromium, если нужна пиксельная точность. Эталон КП (§9) — 8 полос 16:9 со сложной вёрсткой, диаграммами, таблицами, точной типографикой и брендовыми цветами.

## Варианты
1. **@react-pdf/renderer** — React-примитивы (`View`/`Text`), нет полноценного CSS/HTML, flexbox ограничен. Сложную полосу-7 (таблица «рыночной оценки» + блок «ВАША ЦЕНА») воспроизвести дорого.
2. **Playwright + Chromium** — полный Chromium, тяжёл для Vercel.
3. **puppeteer-core + @sparticuz/chromium-min** — headless Chromium, оптимизированный под serverless (Vercel), рендер обычного HTML/CSS → пиксельная точность под эталон.

## Решение
Вариант 3: `puppeteer-core` + `@sparticuz/chromium-min`. Шаблон — обычный HTML/CSS (`src/templates/proposal/template.ts`) → `src/lib/pdf/render.ts`. Даёт точное соответствие эталону и умеренный вес на serverless.

## Последствия
- ➕ Полный CSS → все 8 полос эталона воспроизводимы; рыночная дельта на слайде 7 считается.
- ➖ Холодный старт Chromium на Vercel; нужен внешний pack-URL для бинаря.
- ➖ Тяжелее, чем `@react-pdf/renderer`.
