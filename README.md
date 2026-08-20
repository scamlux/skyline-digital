# Skyline Digital

Digital agency website with an AI-assisted project cost calculator.

## Stack

- **Next.js 16** (App Router, RSC) · **TypeScript** · **Tailwind CSS v4**
- **next-intl** — trilingual UI (ru / en / uz, ru default)
- **Supabase** (PostgreSQL) — leads, estimates & proposals (RLS-locked, server-only)
- **OpenAI** — structured proposal generation (price is NOT decided by AI) — ⚠️ ТЗ §8 requires Anthropic; see `docs/AUDIT.md`
- **Puppeteer** (`puppeteer-core` + `@sparticuz/chromium-min`) — PDF proposals
- **Telegram Bot API** — lead & proposal notifications (server-only)
- **Vercel** — deployment (live: skyline-digital.uz)

## Getting started

```bash
cp .env.example .env.local   # fill in keys
npm install
npm run dev                  # http://localhost:3000
```

## Project structure

```
src/
  app/[locale]/        # public pages (localized)
  app/api/             # estimate, contact, proposal (PDF) route handlers
  i18n/                # next-intl routing, navigation, request config
  lib/pricing/         # deterministic pricing engine (rules + engine)
  lib/ai/              # OpenAI client, schema, prompt
  lib/supabase/        # server client + row types
  lib/pdf/             # HTML -> PDF (Puppeteer)
  lib/validation/      # zod schemas (estimate, contact)
  data/projects.ts     # portfolio (no CMS)
  templates/proposal/  # code-controlled PDF template
messages/              # ru.json, en.json, uz.json
supabase/migrations/   # database schema
```

## Key invariant

The **pricing engine** (`src/lib/pricing`) is the single source of truth for
price and timeline. The AI layer only explains and formats — it never changes
the numbers (enforced in `src/lib/ai/client.ts`).

## Status

Live at **skyline-digital.uz**. Trilingual public site, deterministic pricing
engine + AI proposal calculator, PDF proposals, and a Supabase→Telegram lead
system are shipped. Known gaps vs the spec (admin panel, 3D, Anthropic, tests,
§7 pricing model) are tracked in **[`docs/AUDIT.md`](docs/AUDIT.md)** and
**[`TODO.md`](TODO.md)**; architecture decisions in **[`docs/adr/`](docs/adr/)**.


---

> 📚 **Каноничная документация проекта** — во «втором мозге»: `~/Desktop/Документации/skyline-digital/`
> (обзор · стек · архитектура · деплой · статус). Держим её актуальной; сюда сверяемся и сюда пишем изменения.
>
> _Актуализировано: 2026-08-20._
