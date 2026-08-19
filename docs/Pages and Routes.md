---
tags: [product]
---

# Pages and Routes

All public pages live under `src/app/[locale]/`. Locale prefix is **as-needed**:
`ru` has none, `/en` and `/uz` are prefixed. See [[i18n]].

| Route | File | Purpose |
|---|---|---|
| `/` | `page.tsx` | Home: hero + sunrise, services, previews, process, CTAs |
| `/services` | `services/page.tsx` | All services with starting prices + benefits/examples |
| `/projects` | `projects/page.tsx` | Filterable portfolio grid → [[Portfolio]] |
| `/projects/[slug]` | `projects/[slug]/page.tsx` | Case page (statically generated per slug) |
| `/about` | `about/page.tsx` | Team, principles, stack |
| `/contact` | `contact/page.tsx` | Lead form + calculator nudge |
| `/calculator` | `calculator/page.tsx` | 5-step wizard → [[Calculator Flow]] |
| `/estimate/[token]` | `estimate/[token]/page.tsx` | Estimate result + PDF download (noindex) |
| `/sitemap.xml`, `/robots.txt` | `sitemap.ts`, `robots.ts` | SEO — estimate pages disallowed |

## API routes

| Route | Method | Purpose |
|---|---|---|
| `/api/estimate` | POST | pricing → AI → persist → `{token, pricing, proposal}` |
| `/api/contact` | POST | validate + honeypot → insert lead |
| `/api/proposal/[token]` | GET | fetch estimate → render HTML → PDF |

## Rendering

- Static pages + `/projects/[slug]` use `generateStaticParams` (per locale).
- `/estimate/[token]` is `force-dynamic` (reads DB by token).
- API routes run on the Node.js runtime (Puppeteer/Supabase need it).

Related: [[Architecture]] · [[Design System]]
