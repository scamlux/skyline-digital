import "server-only";
import { z } from "zod";
import { zodResponseFormat } from "openai/helpers/zod";
import { getClient, MODEL } from "@/lib/ai/client";
import { enforceEngineNumbers, logAiCall, withAiGuards } from "@/lib/ai/observability";
import {
  QUALIFY_SYSTEM,
  heuristicQualification,
  qualificationSchema,
  qualifyUserPrompt,
  sanitizeQualification,
  type Qualification,
} from "./qualify";
import { DRAFT_SYSTEM, draftSchema, draftUserPrompt, templateDraft, type Draft, type PortfolioCase } from "./draft";
import { clip, parseBudget, toIso } from "./collectors/util";
import type { PrefilterResult, Quote, RawOpportunity } from "./types";

/**
 * ИИ-вызовы конвейера. Тот же клиент, гарды (30с + ретрай) и журнал
 * ai_calls, что у калькулятора (§8). Любой сбой → детерминированный фолбэк:
 * конвейер не встаёт, просто оценка/текст становятся грубее.
 */

export function aiAvailable(): boolean {
  return Boolean(process.env.OPENAI_API_KEY);
}

async function structured<T extends z.ZodType>(
  touchpoint: string,
  schema: T,
  name: string,
  system: string,
  user: string,
): Promise<z.infer<T>> {
  const started = Date.now();
  try {
    const completion = await withAiGuards(() =>
      getClient().chat.completions.parse({
        model: MODEL,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        response_format: zodResponseFormat(schema, name),
        temperature: 0.3,
      }),
    );
    void logAiCall({ touchpoint, model: MODEL, usage: completion.usage, latencyMs: Date.now() - started, ok: true });
    const parsed = completion.choices[0]?.message.parsed;
    if (!parsed) throw new Error(`no structured ${name}`);
    return parsed as z.infer<T>;
  } catch (err) {
    void logAiCall({ touchpoint, model: MODEL, latencyMs: Date.now() - started, ok: false, error: String(err) });
    throw err;
  }
}

export async function qualifyOpportunity(o: RawOpportunity, pf: PrefilterResult): Promise<Qualification> {
  if (!aiAvailable()) return heuristicQualification(o, pf);
  try {
    const q = await structured("pipeline-qualify", qualificationSchema, "qualification", QUALIFY_SYSTEM, qualifyUserPrompt(o));
    return { ...sanitizeQualification(q), by: "ai" };
  } catch {
    return heuristicQualification(o, pf);
  }
}

export async function draftReply(
  o: RawOpportunity,
  q: Qualification,
  quote: Quote | null,
  portfolio: PortfolioCase[],
): Promise<Draft> {
  if (!aiAvailable()) return templateDraft(o, q, quote, portfolio);
  try {
    const d = await structured("pipeline-draft", draftSchema, "draft", DRAFT_SYSTEM, draftUserPrompt(o, q, quote, portfolio));
    // Валидатор чисел (§8): любая $-сумма, кроме вилки движка, заменяется на неё.
    const allowed = quote ? [quote.totalMin, quote.totalMax] : [];
    const range = quote ? `$${quote.totalMin}–$${quote.totalMax}` : "(цена после созвона)";
    const clean = enforceEngineNumbers(d, allowed, range);
    return { ...clean, language: q.reply_language, by: "ai" };
  } catch {
    return templateDraft(o, q, quote, portfolio);
  }
}

// ——— Ingest: письмо-оповещение / пересланное сообщение → возможности ———

const extractSchema = z.object({
  items: z
    .array(
      z.object({
        title: z.string(),
        description: z.string(),
        url: z.string().nullable(),
        buyer: z.string().nullable(),
        deadline: z.string().nullable(),
      }),
    )
    .max(20),
});

const EXTRACT_SYSTEM = `Из письма-оповещения или пересланного сообщения извлеки ВСЕ отдельные заказы/тендеры/вакансии-проекты.
Для каждого: title, description (полный текст заказа как есть, без пересказа), url (ссылка именно на этот заказ, если есть),
buyer (заказчик), deadline (дата в ISO, если указана). Рекламу, подписи и служебный текст площадки игнорируй.
Если заказов нет — верни пустой список.`;

export interface IngestInput {
  subject?: string | null;
  text: string;
  url?: string | null;
  from?: string | null;
}

/** Без модели: одно сообщение = одна возможность, первая ссылка — её url. */
export function fallbackExtract(input: IngestInput): Omit<RawOpportunity, "source" | "externalId">[] {
  const text = input.text.trim();
  if (!text) return [];
  const budget = parseBudget(`${input.subject ?? ""}\n${text}`);
  return [
    {
      url: input.url ?? /https?:\/\/[^\s<>"')]+/.exec(text)?.[0] ?? null,
      title: clip((input.subject?.trim() || text.split("\n")[0]) ?? "", 140),
      description: text,
      buyer: input.from ?? null,
      budgetMin: budget?.min ?? null,
      budgetMax: budget?.max ?? null,
      currency: budget?.currency ?? null,
    },
  ];
}

export async function extractOpportunities(input: IngestInput): Promise<Omit<RawOpportunity, "source" | "externalId">[]> {
  if (!aiAvailable()) return fallbackExtract(input);
  try {
    const r = await structured(
      "pipeline-extract",
      extractSchema,
      "extract",
      EXTRACT_SYSTEM,
      `Тема: ${input.subject ?? "—"}\nОт: ${input.from ?? "—"}\n\n"""${input.text.slice(0, 12000)}"""`,
    );
    return r.items.map((it) => {
      const budget = parseBudget(`${it.title}\n${it.description}`);
      return {
        url: it.url ?? input.url ?? null,
        title: clip(it.title, 140),
        description: it.description,
        buyer: it.buyer,
        deadline: toIso(it.deadline),
        budgetMin: budget?.min ?? null,
        budgetMax: budget?.max ?? null,
        currency: budget?.currency ?? null,
      };
    });
  } catch {
    return fallbackExtract(input);
  }
}
