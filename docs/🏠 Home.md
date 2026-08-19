---
tags: [moc, skyline-digital]
---

# 🏠 Skyline Digital — Documentation

> Obsidian vault documenting the **Skyline Digital** project — a trilingual
> digital-agency website with an AI-assisted project cost calculator.

**Repo:** https://github.com/scamlux/skyline-digital
**Live app (local):** `npm run dev` → http://localhost:3000

## Map of content

### Product
- [[Overview]] — what the product is and who it's for
- [[Pages and Routes]] — every page and what it does
- [[Portfolio]] — how the case studies work
- [[Calculator Flow]] — the 5-step wizard, end to end

### Engineering
- [[Architecture]] — system diagram and request flows
- [[Tech Stack]] — libraries and why
- [[Project Structure]] — folder map
- [[Pricing Engine]] — the deterministic money core
- [[AI Layer]] — OpenAI structured proposals
- [[PDF Generation]] — Puppeteer proposal export
- [[Database]] — Supabase schema and RLS
- [[i18n]] — ru / en / uz with next-intl

### Design
- [[Design System]] — "Horizon over Tashkent"
- [[Animations and Motion]] — loader, reveals, spotlight

### Ops
- [[Environment Variables]] — required keys
- [[Deployment]] — Vercel
- [[Security]] — secrets, RLS, anti-spam
- [[Roadmap]] — what's done and what's next

## The one rule to remember

> **Code computes the price. The AI never does.** The [[Pricing Engine]] is the
> single source of truth for cost and timeline; the [[AI Layer]] only explains
> and formats, and its price/timeline output is overwritten with engine values.
