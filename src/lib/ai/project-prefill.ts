import "server-only";
import { z } from "zod";
import { zodResponseFormat } from "openai/helpers/zod";
import { getClient, MODEL } from "./client";
import { logAiCall, withAiGuards } from "./observability";

/**
 * Touchpoint C (§5, §8): предзаполнение карточки проекта в админке.
 * Модель получает то, что дал админ (и, если есть URL, — текст живой
 * страницы) и возвращает ЧЕРНОВИК полей формы. Ничего не публикует —
 * админ видит поля, правит и жмёт «Опубликовать» сам.
 * Портфолио одноязычное (§6 i18n отложено) — заполняем на языке ввода.
 */

export const projectPrefillSchema = z.object({
  description: z.string(), // краткое превью до ~140 знаков
  brief: z.string(), // Задача
  solution: z.string(), // Решение
  result: z.string(), // Результат
  technologies: z.array(z.string()).max(12),
  metrics: z.array(z.object({ value: z.string(), label: z.string() })).max(4),
});

export type ProjectPrefill = z.infer<typeof projectPrefillSchema>;

const SYSTEM = `Ты — редактор портфолио веб-студии Skyline Digital (Ташкент).
По входным данным о проекте собери ЧЕРНОВИК карточки для портфолио:
- description: одно ёмкое предложение для превью (до 140 знаков);
- brief: «Задача» — что было нужно клиенту (2–3 предложения);
- solution: «Решение» — что и как сделали (2–3 предложения);
- result: «Результат» — измеримый или качественный эффект (1–2 предложения);
- technologies: список технологий (только релевантные, до 12);
- metrics: 2–3 метрики результата как {value, label}, value коротко ("3", "+38%", "CMS").
Пиши на языке ввода (обычно русский). Не выдумывай факты, которых нет во входе;
если данных мало — формулируй обобщённо, без ложной конкретики. Не указывай цен и сроков.`;

/** Забрать видимый текст живой страницы (best-effort, ≤8000 знаков). */
async function fetchPageText(url: string): Promise<string> {
  try {
    const res = await withAiGuards(
      () => fetch(url, { headers: { "user-agent": "SkylineBot/1.0" } }),
      8000,
    );
    if (!res.ok) return "";
    const html = await res.text();
    return html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 8000);
  } catch {
    return "";
  }
}

export async function parseProjectPrefill(input: {
  title: string;
  url?: string;
  category?: string;
  stack?: string[];
  year?: number | null;
  facts?: string;
}): Promise<ProjectPrefill> {
  const pageText = input.url ? await fetchPageText(input.url) : "";
  const started = Date.now();
  try {
    const completion = await withAiGuards(() =>
      getClient().chat.completions.parse({
        model: MODEL,
        messages: [
          { role: "system", content: SYSTEM },
          {
            role: "user",
            content: `Название: ${input.title}
Тип: ${input.category ?? "—"}
Год: ${input.year ?? "—"}
Стек (если задан): ${(input.stack ?? []).join(", ") || "—"}
Факты от админа: ${input.facts?.trim() || "—"}
${input.url ? `Ссылка: ${input.url}` : ""}
${pageText ? `Текст живой страницы:\n"""${pageText}"""` : ""}`,
          },
        ],
        response_format: zodResponseFormat(projectPrefillSchema, "project_prefill"),
        temperature: 0.5,
      }),
    );
    void logAiCall({
      touchpoint: "project_prefill",
      model: MODEL,
      usage: completion.usage,
      latencyMs: Date.now() - started,
      ok: true,
    });
    const parsed = completion.choices[0]?.message.parsed;
    if (!parsed) throw new Error("no structured prefill");
    return parsed;
  } catch (err) {
    void logAiCall({
      touchpoint: "project_prefill",
      model: MODEL,
      latencyMs: Date.now() - started,
      ok: false,
      error: String(err),
    });
    throw err;
  }
}
