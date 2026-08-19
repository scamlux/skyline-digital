---
tags: [ops]
---

# Deployment

Target: **Vercel**. Repo: https://github.com/scamlux/skyline-digital (public,
default branch `master`).

## Steps

1. Import the GitHub repo into Vercel (framework auto-detected: Next.js).
2. Set env vars (see [[Environment Variables]]) for Production/Preview.
3. Deploy. Every push to `master` triggers a build.

## Build

```bash
npm run build     # Next 16 production build
npm run start     # serve the build locally on :3000
```

Routes summary from the build:
- Static / SSG: home, about, services, projects (+ per-slug), contact,
  calculator, sitemap, robots — per locale.
- Dynamic (ƒ): `/estimate/[token]`, `/api/*`.

## Puppeteer on Vercel

`@sparticuz/chromium` + `puppeteer-core`, marked `serverExternalPackages` in
`next.config.ts`. The proposal route sets `maxDuration = 60`. See
[[PDF Generation]].

## Notes

- Next 16 defaults: Node runtime, 300s max function timeout on all plans.
- The estimate PDF route is Node-runtime (needs chromium + supabase-js).
- Local dev: `npm run dev`.

Related: [[Architecture]] · [[Environment Variables]]
