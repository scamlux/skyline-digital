---
tags: [engineering, core, ai]
---

# AI Layer

Turns a computed estimate into a written commercial proposal. Lives in
`src/lib/ai/`. Uses **OpenAI structured outputs** so the model must return a
fixed JSON shape.

## Files

- `schema.ts` — the `proposalSchema` (Zod) the model must fill
- `prompt.ts` — `SYSTEM_PROMPT` (hard rules) + `buildUserPrompt(...)`
- `client.ts` — `generateProposal(...)` via `openai` SDK

## Model

`OPENAI_MODEL` env (default `gpt-4o-mini`). Must support structured outputs.
Uses `client.chat.completions.parse` with `zodResponseFormat(proposalSchema)`.

## Output shape

```ts
Proposal = {
  projectTitle, summary,
  objectives[], scope[], features[], recommendedStack[],
  timeline: { weeks, phases[] },
  price: { min, max },
  recommendations[], nextSteps[],
}
```

## The safety guarantee

The [[Pricing Engine]] result is authoritative. After the model responds,
`generateProposal` **overwrites** `price` and `timeline.weeks` with the engine's
values:

```ts
return { ...parsed,
  price: { min: pricing.totalMin, max: pricing.totalMax },
  timeline: { ...parsed.timeline, weeks: pricing.estimatedWeeks } };
```

## System-prompt rules (enforced in prompt)

1. Price is fixed — never invent/recalculate.
2. Timeline total is fixed.
3. Never invent features the client didn't select.
4. No unrealistic deadlines/guarantees.
5. Only recommend genuinely needed tech.
6. Answer in the client's language (default Russian).

## Failure handling

`/api/estimate` returns HTTP 502 if generation fails, without leaking details.
The key is server-only — see [[Security]] and [[Environment Variables]].

Related: [[Architecture]] · [[PDF Generation]]
