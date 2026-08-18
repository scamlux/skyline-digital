# Skyline Digital

Digital agency website with an AI-assisted project cost calculator.

## Stack

- **Next.js 16** (App Router, RSC) · **TypeScript** · **Tailwind CSS v4**
- **next-intl** — trilingual UI (ru / en / uz, ru default)
- **Supabase** (PostgreSQL) — leads & estimates
- **OpenAI** — structured proposal generation (price is NOT decided by AI)
- **Puppeteer** (`puppeteer-core` + `@sparticuz/chromium`) — PDF proposals
- **Vercel** — deployment

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

Design-independent foundation is in place and builds. The visual layer
(pages/components) and the PDF template design are pending the Figma file and
the reference proposal PDF.
