---
tags: [engineering]
---

# PDF Generation

Renders the [[AI Layer|proposal]] to a downloadable PDF. **The AI never
generates HTML/CSS** — it only supplies structured data. The template is
code-controlled and swappable.

## Pieces

- `src/templates/proposal/template.ts` — `renderProposalHtml(proposal, meta)`
  returns a self-contained HTML string (inline CSS). *Visual is a placeholder
  pending the reference PDF; data binding is final.*
- `src/lib/pdf/render.ts` — `htmlToPdf(html): Uint8Array` via Puppeteer.
- `src/app/api/proposal/[token]/route.ts` — fetch estimate by token → render →
  return `application/pdf` as an attachment.

## Puppeteer strategy

```
isServerless = VERCEL || AWS_REGION
  ├─ serverless → @sparticuz/chromium (bundled headless chromium)
  └─ local      → system Google Chrome (no Chromium download)
                  override with CHROME_EXECUTABLE_PATH
```

`next.config.ts` marks `puppeteer-core` and `@sparticuz/chromium` as
`serverExternalPackages` so they aren't bundled. Route sets `maxDuration = 60`.

## Local note

Per project memory: use installed Google Chrome for headless rendering; do not
install Playwright/Chromium. `render.ts` probes common Chrome paths.

Related: [[AI Layer]] · [[Deployment]]
