import OpenAI from "openai";
import { zodResponseFormat } from "openai/helpers/zod";
import type { PricingResult, ProjectConfiguration } from "@/lib/pricing/types";
import type { ProjectInfo } from "@/lib/validation/estimate";
import { proposalSchema, type Proposal } from "./schema";
import { SYSTEM_PROMPT, buildUserPrompt } from "./prompt";

export const MODEL = process.env.OPENAI_MODEL ?? "gpt-4o-mini";

let cached: OpenAI | null = null;
export function getClient(): OpenAI {
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
  const { withAiGuards, logAiCall, enforceEngineNumbers } = await import("./observability");
  const client = getClient();
  const started = Date.now();

  try {
    const completion = await withAiGuards(() =>
      client.chat.completions.parse({
        model: MODEL,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: buildUserPrompt(input) },
        ],
        response_format: zodResponseFormat(proposalSchema, "proposal"),
        temperature: 0.4,
      }),
    );
    void logAiCall({
      touchpoint: "proposal",
      model: MODEL,
      usage: completion.usage,
      latencyMs: Date.now() - started,
      ok: true,
    });

    const parsed = completion.choices[0]?.message.parsed;
    if (!parsed) {
      throw new Error("Model returned no structured proposal");
    }

    // Валидатор чисел (§8): чужие $-суммы в прозе → официальная вилка движка.
    // Числа (цена, недели, рынок) живут только в движке и подставляются в
    // шаблоне; схема КП их вообще не содержит, так что модели нечего ломать.
    const range = `$${input.pricing.totalMin}–$${input.pricing.totalMax}`;
    const cleaned = enforceEngineNumbers(
      parsed,
      [input.pricing.totalMin, input.pricing.totalMax, input.pricing.total, input.pricing.subtotal],
      range,
    );
    return cleaned;
  } catch (err) {
    void logAiCall({
      touchpoint: "proposal",
      model: MODEL,
      latencyMs: Date.now() - started,
      ok: false,
      error: String(err),
    });
    throw err;
  }
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
  const { info } = input;
  const title = info.projectName?.trim() || "Ваш проект";

  // Фолбэк: КП всё равно выдаётся (§8). Текст шаблонный — уникальность даёт
  // только модель; но структура совпадает со строгой схемой, числа подставит
  // шаблон из движка.
  return {
    projectTitle: title,
    infraNarrative:
      "Система собрана так, чтобы вы видели и управляли всем сами: сайт для клиентов, " +
      "админ-панель для контента и заявки, которые приходят напрямую вам.",
    summary:
      `Предварительная смета по проекту «${title}». Расчёт стоимости и сроков ` +
      `выполнен автоматически. Детальное коммерческое предложение согласуем ` +
      `индивидуально после короткого созвона.`,
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
    designRationale:
      "Дизайн соберём в вашем фирменном стиле: единая сетка, типографика и компоненты, " +
      "адаптив под мобильные и десктоп.",
    recommendedStack: ["Next.js", "TypeScript", "PostgreSQL", "Vercel"],
    processIntro: "Путь клиента — от первого касания до заявки у вас в Telegram.",
    processSteps: [
      { title: "Клиент находит вас", text: "Поиск, рекомендации или реклама приводят его к вам." },
      { title: "Изучает и убеждается", text: "Первый экран и кейсы снимают вопросы доверия." },
      { title: "Оставляет заявку", text: "Короткая форма — имя и контакт, ничего лишнего." },
      { title: "Заявка приходит мгновенно", text: "Telegram и почта — уведомление за пару секунд." },
    ],
    checklistIntro:
      "Эти материалы нужны по ходу работы — начать можно без них, соберём вместе на первой неделе.",
    stageDeliverables: [
      "Инициация, дизайн, сервер",
      "Разработка основных экранов",
      "Наполнение, заявки, интеграции",
      "Тестирование, обучение, запуск",
    ],
    whyUs:
      "Берём проект под ключ: дизайн, разработку, запуск и поддержку — один подрядчик, одна ответственность.",
    nextStep: "Свяжемся с вами, подтвердим детали и подготовим финальное коммерческое предложение.",
  };
}

export { proposalSchema };
export type { Proposal };
