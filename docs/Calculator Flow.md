---
tags: [product, core]
---

# Calculator Flow

The signature feature. A 5-step wizard (`components/calculator/Wizard.tsx`,
client) that ends in a priced, AI-written proposal. Progress is shown by
`SunProgress` — the sun travels along the horizon from step 1 to 5.

## Steps

1. **Project type** — one of the 7 types (see [[Pricing Engine]]).
2. **Features** — options **depend on the type** (`featuresByType`), each with a
   `+$` price.
3. **Extras** — cross-cutting addons (design, branding, SEO, analytics, support)
   + urgency toggle (normal / +35%).
4. **About the project** — name, description, deadline, budget, contact name,
   email, messenger. Includes a hidden honeypot field.
5. **Estimate** — the result.

A **running total** (client-side `computePricing`) is shown from step 1 on.

## Submit → result

```
POST /api/estimate { configuration, info }
  → [[Pricing Engine]] recomputes authoritatively
  → [[AI Layer]] writes the proposal (price/timeline overwritten)
  → [[Database]] saves lead + estimate, returns token
  → result rendered inline; also at /estimate/[token] (permanent, noindex)
  → "Download proposal" → [[PDF Generation]]
```

## Validation

Zod schemas in `src/lib/validation/estimate.ts`:
- Features must belong to the selected type's catalog (server-side `superRefine`).
- Honeypot `company` must be empty.
- Email/required fields validated client- and server-side.

## Failure modes

- AI down → 502, wizard shows a generic error, user can retry.
- DB down → 500. (Both are logged without leaking details — see [[Security]].)

Related: [[Pages and Routes]] · [[Overview]]
