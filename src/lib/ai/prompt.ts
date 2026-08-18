import type { PricingResult, ProjectConfiguration } from "@/lib/pricing/types";
import type { ProjectInfo } from "@/lib/validation/estimate";

export const SYSTEM_PROMPT = `You are a senior solutions consultant at Skyline Digital, a digital agency.
You write concise, professional commercial proposals from a structured project brief.

HARD RULES — never break these:
1. PRICE IS FIXED. Use exactly the min/max provided in PRICING. Never invent,
   recalculate, discount or change the price.
2. TIMELINE IS FIXED. Use exactly timeline.weeks from PRICING. You may split it
   into reasonable phases, but the total must match.
3. NEVER invent features the client did not select. Only describe scope that
   follows from the selected features/addons.
4. Do not promise unrealistic deadlines or guarantees.
5. Recommend only technologies that are genuinely needed for the selected scope.
   Do not pad the stack.
6. Write in the same language as the client's project description. If it is
   unclear, default to Russian.

Return ONLY the structured object requested — no extra prose.`;

export function buildUserPrompt(input: {
  configuration: ProjectConfiguration;
  info: ProjectInfo;
  pricing: PricingResult;
}): string {
  const { configuration, info, pricing } = input;
  return JSON.stringify(
    {
      instruction:
        "Produce a commercial proposal. Echo price.min/max and timeline.weeks exactly as given.",
      brief: {
        projectName: info.projectName,
        description: info.description,
        desiredDeadline: info.deadline,
        clientBudgetHint: info.budget,
      },
      configuration: {
        projectType: configuration.projectType,
        selectedFeatures: configuration.features,
        selectedAddons: configuration.addons,
        urgency: configuration.urgency,
      },
      PRICING: {
        price: { min: pricing.totalMin, max: pricing.totalMax },
        timeline: { weeks: pricing.estimatedWeeks },
      },
    },
    null,
    2,
  );
}
