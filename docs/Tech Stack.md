---
tags: [engineering]
---

# Tech Stack

| Concern | Choice | Notes |
|---|---|---|
| Framework | **Next.js 16** (App Router, RSC) | Server Components by default |
| Language | **TypeScript** (strict) | |
| Styling | **Tailwind CSS v4** | Tokens via `@theme` in `globals.css` — see [[Design System]] |
| i18n | **next-intl** | ru / en / uz — see [[i18n]] |
| Database | **Supabase** (PostgreSQL) | leads + estimates — see [[Database]] |
| AI | **OpenAI** (structured outputs) | see [[AI Layer]] |
| PDF | **Puppeteer** (`puppeteer-core` + `@sparticuz/chromium`) | see [[PDF Generation]] |
| Validation | **Zod** | client + server |
| Fonts | Unbounded / Golos Text / JetBrains Mono | via `next/font/google` |
| Deploy | **Vercel** | see [[Deployment]] |

## Why these

- **RSC by default** keeps JS small; only the wizard, forms, header and small
  motion helpers are client components.
- **next-intl** with `localePrefix: "as-needed"` → ru has no prefix, `/en` and
  `/uz` do.
- **Puppeteer stack** chosen for pixel-accurate proposals; `@sparticuz/chromium`
  makes it work in Vercel's serverless runtime.
- **No ORM** — the schema is two tables, accessed via `@supabase/supabase-js`.

## Notable versions

Next.js 16 renamed the `middleware` file convention to **`proxy`** — the app
uses `src/proxy.ts`. See [[Architecture]].

Related: [[Project Structure]] · [[Environment Variables]]
