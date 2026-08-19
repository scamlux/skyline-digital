---
tags: [design]
---

# Design System

Codename **"Horizon over Tashkent."** Tokens live in
`src/app/globals.css` via Tailwind v4 `@theme`. No hardcoded colors in
components — only tokens.

## Concept

The site lives in two skies split by a **horizon line**:
- **Night** (`#1A2238`) — header, hero, footer, calculator.
- **Day** (`#F5F7FA`) — content sections.

Signature element: **the sun** — a gradient disc (apricot → afterglow) that
rises in the hero and becomes the calculator's progress indicator
(`SunProgress`), travelling along the horizon step by step.

## Palette

| Token | Hex | Use |
|---|---|---|
| `--color-night` | `#1A2238` | dark sections |
| `--color-night-deep` | `#131A2C` | cards on night |
| `--color-day` | `#F5F7FA` | light sections |
| `--color-ink` | `#1C2130` | body text |
| `--color-muted` / `--color-mist` | `#5B6272` / `#8B93A7` | secondary text |
| `--color-line` / `--color-line-night` | `#DDE2EA` / `#2C3550` | rules |
| `--color-apricot` | `#FFAE5C` | sun / accent start |
| `--color-afterglow` | `#E8517C` | sun / accent end |

`.horizon-gradient`, `.text-horizon`, `.sun-disc`, `.sun-aurora` are the shared
gradient utilities.

## Typography

- **Unbounded** — display (h1/h2, numbers), used with restraint.
- **Golos Text** — body / UI.
- **JetBrains Mono** — prices, eyebrows, labels.

Full Cyrillic + Latin subsets (ru + uz). The user asked to keep these fonts.

## Structural devices

- **Section eyebrow sits ON the horizon line** (`Section.tsx`) — a label
  straddling the rule, like a building on a skyline.
- Numbered markers **only** in the Process section (a real sequence).

Related: [[Animations and Motion]] · [[Pages and Routes]]
