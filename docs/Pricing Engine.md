---
tags: [engineering, core]
---

# Pricing Engine

The deterministic money core. Lives in `src/lib/pricing/`. **This is the only
place price and timeline are decided** — the [[AI Layer]] never changes them.

> ⚠️ Numbers below are **draft values** pending owner sign-off. They live only
> in `rules.ts` — never hardcode prices in UI or the engine.

## Files

- `types.ts` — `ProjectType`, `Urgency`, `ProjectConfiguration`, `PricingResult`
- `rules.ts` — all money & durations (single source of truth)
- `engine.ts` — `computePricing(config): PricingResult` (pure function)
- `index.ts` — re-exports

## Inputs

```ts
ProjectConfiguration = {
  projectType: "website" | "webApp" | "mobileApp" | "ai" | "automation" | "uiux" | "other",
  features: string[],   // keys valid for the chosen type
  addons: string[],     // design, branding, seo, analytics, support
  urgency: "normal" | "urgent",
}
```

## Formula (`engine.ts`)

```
basePrice   = basePrices[type].price + Σ features[key].price
subtotal    = basePrice + Σ addons[key].price
total       = subtotal × urgencyMultiplier          // urgent = 1.35
totalMin    = round(total × (1 - 0.12), 50)          // ±12% range
totalMax    = round(total × (1 + 0.12), 50)
weeks       = basePrices[type].weeks + Σ feature/addon weeks
              urgent compresses: × 0.7,  min 1 week
```

Output:

```ts
PricingResult = { basePrice, addonsPrice, urgencyMultiplier,
                  totalMin, totalMax, estimatedWeeks }
```

## Base prices (draft, USD)

| Type | Base | Weeks |
|---|--:|--:|
| website | 700 | 2 |
| webApp | 1500 | 4 |
| mobileApp | 2500 | 6 |
| ai | 2000 | 4 |
| automation | 1200 | 3 |
| uiux | 800 | 2 |
| other | 1000 | 3 |

Features (per type) and addons each add a `{price, weeks}` — full list in
`rules.ts`. The wizard shows only features valid for the selected type via
`featuresByType`.

## Live preview

The wizard runs `computePricing` **client-side** on every change to show a
running total, then the server recomputes authoritatively in `/api/estimate`.

Related: [[Calculator Flow]] · [[AI Layer]]
