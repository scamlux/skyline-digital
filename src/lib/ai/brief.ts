import "server-only";
import { z } from "zod";
import { zodResponseFormat } from "openai/helpers/zod";
import { getClient, MODEL } from "./client";
import { featuresByType, addonKeys } from "@/lib/pricing/rules";
import type { ProjectType } from "@/lib/pricing/types";
import { logAiCall, withAiGuards } from "./observability";

/**
 * Touchpoint A (§8): разбор свободного описания клиента в калькуляторе.
 * Выход строго по схеме; suggested_option_keys — ТОЛЬКО ключи из прайса
 * (валидируется после ответа, чужие ключи отбрасываются). Цифр в выходе нет.
 */

export const briefSchema = z.object({
  understood_scope: z.string(),
  suggested_option_keys: z.array(z.string()),
  clarifying_questions: z.array(z.string()).max(4),
  risk_flags: z.array(z.string()).max(4),
});

export type BriefResult = z.infer<typeof briefSchema>;

const SYSTEM = `Ты — технический пресейл веб-студии Skyline Digital (Ташкент).
Разбери описание проекта клиента. Верни:
- understood_scope: 2–3 предложения, как ты понял задачу (на языке клиента);
- suggested_option_keys: ключи опций из СПИСКА НИЖЕ, которые клиенту, вероятно, нужны, но он их не выбрал;
- clarifying_questions: до 4 вопросов, которые снимут неопределённость;
- risk_flags: до 4 рисков (интеграции, контент, сроки).
НИКАКИХ цен, сумм и сроков в тексте. Только ключи из списка, ничего вне его.`;

export async function parseBrief(input: {
  projectType: ProjectType;
  description: string;
  selectedFeatures: string[];
  selectedAddons: string[];
}): Promise<BriefResult> {
  const allowedKeys = [
    ...(featuresByType[input.projectType] ?? []),
    ...addonKeys,
  ].filter((k) => !input.selectedFeatures.includes(k) && !input.selectedAddons.includes(k));

  const started = Date.now();
  try {
    const completion = await withAiGuards(() =>
      getClient().chat.completions.parse({
        model: MODEL,
        messages: [
          { role: "system", content: SYSTEM },
          {
            role: "user",
            content: `Тип проекта: ${input.projectType}
Уже выбрано: ${[...input.selectedFeatures, ...input.selectedAddons].join(", ") || "ничего"}
Доступные ключи опций: ${allowedKeys.join(", ")}
Описание клиента:
"""${input.description.slice(0, 4000)}"""`,
          },
        ],
        response_format: zodResponseFormat(briefSchema, "brief"),
        temperature: 0.3,
      }),
    );
    void logAiCall({
      touchpoint: "brief",
      model: MODEL,
      usage: completion.usage,
      latencyMs: Date.now() - started,
      ok: true,
    });
    const parsed = completion.choices[0]?.message.parsed;
    if (!parsed) throw new Error("no structured brief");
    // Ключи вне прайса отбрасываются молча — модель не расширяет каталог.
    return {
      ...parsed,
      suggested_option_keys: parsed.suggested_option_keys.filter((k) => allowedKeys.includes(k)),
    };
  } catch (err) {
    void logAiCall({
      touchpoint: "brief",
      model: MODEL,
      latencyMs: Date.now() - started,
      ok: false,
      error: String(err),
    });
    throw err;
  }
}
