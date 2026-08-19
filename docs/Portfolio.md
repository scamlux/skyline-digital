---
tags: [product]
---

# Portfolio

Case studies without a CMS — data lives in `src/data/projects.ts`. Rendered by
`ProjectsGrid` (`/projects`, filterable) and per-slug pages
(`/projects/[slug]`). Cards use `PreviewCard` (browser frame + hover pan).

## Data shape

```ts
Project = { slug, title, category, description, image,
            technologies[], year, url? }
ProjectCategory = "web" | "mobile" | "ai" | "automation"
```

Filter tabs: All / Web / Mobile / AI / Automation.

## Current entries (real projects)

| Slug | Title | Category | Live |
|---|---|---|---|
| influencehub | InfluenceHub | web | famic.vercel.app |
| contento | Contento | automation | contento-web.vercel.app |
| govbot | GovBot | ai | govbot-web.vercel.app |
| careeros | CareerOS | ai | nisahr-web.vercel.app |

## Preview images

Under `public/projects/*.jpg`. These are **tall stitched screenshots** of the
live sites (multiple viewport captures composited with `sharp`). `PreviewCard`
shows them in a browser chrome and slowly pans top→bottom on hover, so a card
reads like scrolling the real site. See [[Animations and Motion]].

## Adding a project

1. Add an entry to `projects.ts`.
2. Drop a preview image in `public/projects/`.
3. `generateStaticParams` picks up the new slug automatically.

Related: [[Pages and Routes]] · [[Design System]]
