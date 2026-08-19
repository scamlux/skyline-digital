---
tags: [engineering]
---

# Project Structure

```
skyline-digital/
├── src/
│   ├── app/
│   │   ├── [locale]/                 # localized pages (RSC)
│   │   │   ├── layout.tsx            # fonts, Header, Footer, Loader, i18n provider
│   │   │   ├── page.tsx              # Home
│   │   │   ├── about/ services/ projects/ contact/ calculator/
│   │   │   ├── projects/[slug]/      # dynamic case page (ISR-able)
│   │   │   ├── estimate/[token]/     # estimate result + proposal link
│   │   │   └── not-found.tsx
│   │   ├── api/
│   │   │   ├── estimate/route.ts     # pricing → AI → save
│   │   │   ├── contact/route.ts      # lead → Supabase
│   │   │   └── proposal/[token]/     # HTML → PDF
│   │   ├── globals.css               # design tokens + animations
│   │   ├── sitemap.ts · robots.ts
│   ├── components/
│   │   ├── layout/     Header, Footer
│   │   ├── ui/         Section, Reveal, Loader, Spotlight, Marquee
│   │   ├── projects/   ProjectsGrid, PreviewCard
│   │   ├── calculator/ Wizard, SunProgress
│   │   └── contact/    ContactForm
│   ├── lib/
│   │   ├── pricing/    types, rules, engine, index   → [[Pricing Engine]]
│   │   ├── ai/         client, schema, prompt         → [[AI Layer]]
│   │   ├── supabase/   server, types                  → [[Database]]
│   │   ├── pdf/        render                          → [[PDF Generation]]
│   │   ├── validation/ estimate, contact
│   │   └── utils.ts
│   ├── data/projects.ts               # portfolio (no CMS) → [[Portfolio]]
│   ├── templates/proposal/template.ts # code-controlled PDF HTML
│   ├── i18n/           routing, navigation, request     → [[i18n]]
│   └── proxy.ts                        # next-intl middleware (Next 16 name)
├── messages/           ru.json · en.json · uz.json
├── supabase/migrations/0001_init.sql
├── public/projects/    live-site preview screenshots
├── docs/               ← this Obsidian vault
└── .env.example        → [[Environment Variables]]
```

Related: [[Architecture]] · [[Pages and Routes]]
