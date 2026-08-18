import OpenAI from "openai";
import { zodResponseFormat } from "openai/helpers/zod";
import type { PricingResult, ProjectConfiguration } from "@/lib/pricing/types";
import type { ProjectInfo } from "@/lib/validation/estimate";
import { proposalSchema, type Proposal } from "./schema";
import { SYSTEM_PROMPT, buildUserPrompt } from "./prompt";

const MODEL = process.env.OPENAI_MODEL ?? "gpt-4o-mini";

let cached: OpenAI | null = null;
function getClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured");
  }
  cached ??= new OpenAI({ apiKey });
  return cached;
}

/**
 * Generate a structured commercial proposal. The pricing engine result is the
 * source of truth: whatever the model returns for price/timeline.weeks is
 * overwritten with the engine values before returning.
 */
export async function generateProposal(input: {
  configuration: ProjectConfiguration;
  info: ProjectInfo;
  pricing: PricingResult;
}): Promise<Proposal> {
  const client = getClient();

  const completion = await client.chat.completions.parse({
    model: MODEL,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: buildUserPrompt(input) },
    ],
    response_format: zodResponseFormat(proposalSchema, "proposal"),
    temperature: 0.4,
  });

  const parsed = completion.choices[0]?.message.parsed;
  if (!parsed) {
    throw new Error("Model returned no structured proposal");
  }

  // Enforce deterministic values — the AI never decides money or duration.
  return {
    ...parsed,
    price: { min: input.pricing.totalMin, max: input.pricing.totalMax },
    timeline: {
      ...parsed.timeline,
      weeks: input.pricing.estimatedWeeks,
    },
  };
}

export { proposalSchema };
export type { Proposal };
