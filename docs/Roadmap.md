---
tags: [product]
---

# Roadmap

## Done ✅

- Trilingual site (ru/en/uz), all pages — see [[Pages and Routes]], [[i18n]]
- [[Design System]] "Horizon over Tashkent" + [[Animations and Motion]]
  (sunrise loader, hero reveal, star field, spotlight, marquee, live previews)
- [[Pricing Engine]] (deterministic) + wizard live preview
- [[AI Layer]] (OpenAI structured outputs, price-locked)
- [[PDF Generation]] pipeline (Puppeteer, Vercel-ready)
- [[Database]] schema + migration + RLS
- Real [[Portfolio]] (InfluenceHub, Contento, GovBot, CareerOS) with previews
- SEO: sitemap, robots, per-page metadata; honeypot anti-spam
- GitHub repo + `OPENAI_API_KEY` wired locally

## Next ⬜

- **Supabase creds** → enable saving leads/estimates and `/estimate/[token]`
  (currently the only blocker for the full end-to-end flow).
- **Deploy to Vercel** + set env vars — see [[Deployment]].
- **Confirm pricing numbers** — values in `rules.ts` are drafts.
- **PDF template design** — match the reference proposal PDF (data binding done,
  visual is a placeholder). See [[PDF Generation]].
- Optional: Figma-exact restyle if the "wolf" mockup should be matched 1:1.
- Optional: rate-limiting on `/api/estimate` (in addition to honeypot).

Related: [[🏠 Home]] · [[Overview]]
