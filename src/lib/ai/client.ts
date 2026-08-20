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

/**
 * Deterministic template proposal used when the model is unavailable or errors.
 * Per the project spec, an estimate must still be issued on AI failure — the
 * numbers come from the pricing engine, only the prose is templated.
 */
export function fallbackProposal(input: {
  configuration: ProjectConfiguration;
  info: ProjectInfo;
  pricing: PricingResult;
}): Proposal {
  const { configuration, info, pricing } = input;
  const title = info.projectName?.trim() || "Ваш проект";
  const featureCount = configuration.features?.length ?? 0;

  return {
    projectTitle: title,
    summary:
      `Предварительная смета по проекту «${title}». Расчёт стоимости и сроков ` +
      `выполнен автоматически. Детальное коммерческое предложение мы подготовим и ` +
      `согласуем с вами индивидуально после короткого созвона.`,
    objectives: [
      "Уточнить цели и ключевые сценарии проекта",
      "Согласовать состав работ и приоритеты",
      "Запустить проект в оговорённые сроки и бюджет",
    ],
    scope: [
      "Проектирование структуры и пользовательских сценариев",
      "Дизайн интерфейса в фирменном стиле",
      "Разработка и интеграции",
      "Тестирование, запуск и передача проекта",
    ],
    features:
      featureCount > 0
        ? [`Выбрано опций: ${featureCount}`, "Полный список согласуем на созвоне"]
        : ["Базовый набор функций", "Расширения обсудим на созвоне"],
    recommendedStack: ["Next.js", "TypeScript", "PostgreSQL", "Vercel"],
    timeline: {
      weeks: pricing.estimatedWeeks,
      phases: [
        "Аналитика и проектирование",
        "Дизайн",
        "Разработка",
        "Тестирование и запуск",
      ],
    },
    price: { min: pricing.totalMin, max: pricing.totalMax },
    recommendations: [
      "Рекомендуем короткий вводный созвон для уточнения деталей",
    ],
    nextSteps: [
      "Свяжемся с вами для подтверждения деталей",
      "Подготовим финальное коммерческое предложение",
    ],
  };
}

export { proposalSchema };
export type { Proposal };
