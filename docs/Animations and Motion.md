---
tags: [design]
---

# Animations and Motion

All motion is CSS-driven (keyframes in `globals.css`) with tiny client helpers.
**`prefers-reduced-motion` disables everything** (loader hidden, reveals land
instantly).

## Loading screen — "sunrise curtain"

`components/ui/Loader.tsx`. On first visit per browser session: the horizon line
draws, the sun rises over it (clipped), the wordmark settles, then the whole
overlay lifts. Gated by `sessionStorage["skyline-loaded"]`.

## Hero

- **Word-by-word reveal**: each word flies in with blur (`.hero-word`,
  staggered via `--d`). The `*asterisk*` word gets `.text-horizon` gradient.
- **Star field**: two parallax layers (`.stars`, `.stars-far`) drifting.
- **Mouse spotlight**: `components/ui/Spotlight.tsx` sets CSS vars so a warm
  radial glow follows the cursor — zero re-renders.
- **Sun**: `.sun-aurora` glow + `.animate-sun-breathe` slow pulse; rises via
  `.animate-sunrise`.
- **Horizon line** draws in with `.animate-line-draw`.

## Reusable

- `components/ui/Reveal.tsx` — IntersectionObserver adds `.is-visible`
  (opacity + translate + blur out).
- `components/ui/Marquee.tsx` — infinite ticker along the horizon; pauses on hover.
- `components/projects/PreviewCard.tsx` — `.preview-pan` slowly scrolls the tall
  screenshot on hover (see [[Portfolio]]).
- Global glow-on-hover for `.horizon-gradient` buttons; `main` has a page-enter fade.

Related: [[Design System]]
