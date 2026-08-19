---
tags: [engineering]
---

# Architecture

One Next.js app deployed on [[Deployment|Vercel]]. Server Components render
pages; all money and AI logic runs **server-side** in route handlers. Data
lives in [[Database|Supabase]].

## Request flows

### Estimate (the core flow)

```
Wizard (client)
   │  POST /api/estimate   { configuration, info }
   ▼
[[Pricing Engine]]  → deterministic PricingResult (the number)
   ▼
[[AI Layer]]        → OpenAI structured JSON (explanation)
   │                  price/timeline OVERWRITTEN with engine values
   ▼
[[Database]]        → insert lead + estimate, return token
   ▼
Client shows result inline  ─────►  /estimate/[token]  (permanent link)
                                        │  "Download proposal"
                                        ▼
                                   GET /api/proposal/[token]
                                        ▼
                                   [[PDF Generation]] (Puppeteer)
```

### Contact

```
Contact form (client) ─ POST /api/contact ─► zod validate + honeypot ─► leads
```

## Layers

- **`src/app/[locale]/*`** — localized pages (RSC). See [[Pages and Routes]].
- **`src/app/api/*`** — route handlers: `estimate`, `contact`, `proposal/[token]`.
- **`src/lib/*`** — framework-agnostic logic: `pricing`, `ai`, `supabase`,
  `pdf`, `validation`, `utils`.
- **`src/components/*`** — UI, grouped by area.
- **`src/i18n/*`** + **`src/proxy.ts`** — routing/locale middleware.
- **`messages/*.json`** — translation bundles.

## Invariants

1. The AI never decides price/timeline (enforced in `src/lib/ai/client.ts`).
2. All secrets are server-only. See [[Security]].
3. Every estimate stores a snapshot of its `pricing_result` — changing prices
   later does not mutate issued estimates.

Related: [[Project Structure]] · [[Tech Stack]]
