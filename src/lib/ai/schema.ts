import { z } from "zod";

/**
 * Structured proposal returned by the model. This is the ONLY shape the AI is
 * allowed to produce (enforced via OpenAI structured outputs). Price and
 * timeline.weeks are echoed from the deterministic pricing engine — the model
 * must not alter them.
 */
export const proposalSchema = z.object({
  projectTitle: z.string(),
  summary: z.string(),
  objectives: z.array(z.string()),
  scope: z.array(z.string()),
  features: z.array(z.string()),
  recommendedStack: z.array(z.string()),
  timeline: z.object({
    weeks: z.number(),
    phases: z.array(z.string()),
  }),
  price: z.object({
    min: z.number(),
    max: z.number(),
  }),
  recommendations: z.array(z.string()),
  nextSteps: z.array(z.string()),
});

export type Proposal = z.infer<typeof proposalSchema>;
