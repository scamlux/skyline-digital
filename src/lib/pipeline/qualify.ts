import { z } from "zod";
import type { ProjectType } from "@/lib/pricing";
import { allowedKeys, isProjectType } from "./quote";
import type { PrefilterResult, RawOpportunity } from "./types";

/**
 * ИИ-квалификация возможности: подходит ли студии, что именно нужно
 * клиенту, какой тип проекта и опции из каталога, как подаваться. Денег
 * в выходе нет — цену считает движок (quote.ts).
 */

export const STUDIO_PROFILE = `Skyline Digital — веб-студия одного разработчика из Ташкента (GMT+5).
Делаем: сайты и лендинги, интернет-магазины (Payme/Click/Uzum, Stripe-ready), веб-приложения и MVP,
личные кабинеты и админки, ИИ-чат-боты и RAG, Telegram-боты, автоматизацию и интеграции с CRM/1С,
UI/UX-дизайн. Стек: Next.js, TypeScript, React, Tailwind, Supabase/Postgres, Vercel.
Языки: русский, узбекский, английский. Работаем удалённо с любой страной.
НЕ делаем: поставки оборудования, стройку, найм в штат, нативные игры, 1С-программирование без веба,
проекты, требующие команды больше 3 человек или офисного присутствия вне Ташкента.`;

const PROJECT_TYPES = ["website", "webApp", "mobileApp", "ai", "automation", "uiux", "other"] as const;

export const qualificationSchema = z.object({
  fit_score: z.number().int().min(0).max(100),
  verdict: z.enum(["go", "maybe", "no"]),
  summary: z.string(),
  client_need: z.string(),
  deliverables: z.array(z.string()).max(8),
  project_type: z.enum(PROJECT_TYPES),
  feature_keys: z.array(z.string()).max(12),
  required_stack: z.array(z.string()).max(10),
  risks: z.array(z.string()).max(4),
  questions: z.array(z.string()).max(4),
  reply_language: z.enum(["ru", "uz", "en"]),
  submission_channel: z.enum(["platform", "email", "portal", "telegram", "unknown"]),
  submission_how: z.string(),
  contact: z.string().nullable(),
});

export type Qualification = z.infer<typeof qualificationSchema> & {
  /** Как получена оценка: модель или эвристика (нет ключа / сбой модели). */
  by: "ai" | "heuristic";
};

export const QUALIFY_SYSTEM = `Ты — пресейл веб-студии. Оцени, стоит ли студии браться за возможность.
Профиль студии:
${STUDIO_PROFILE}

Верни строго по схеме:
- fit_score 0–100: насколько это наш проект и насколько реально его выиграть одному разработчику;
- verdict: go (подаваться), maybe (смотреть владельцу), no (не наше);
- summary: 2–3 предложения по-русски — что за проект и почему подходит/не подходит;
- client_need: одной фразой, что клиенту нужно на самом деле;
- deliverables: что придётся сдать;
- project_type и feature_keys: ТОЛЬКО ключи из присланного каталога, ничего вне его;
- reply_language: язык, на котором отвечать заказчику;
- submission_channel/submission_how: как подаётся отклик (кнопка на площадке, письмо с CV на e-mail, портал закупок, ответ в Telegram) и что приложить;
- contact: e-mail или @username заказчика, если есть в тексте, иначе null.
НИКАКИХ цен, сумм, ставок и сроков в неделях — это считает код.`;

export function catalogText(): string {
  return PROJECT_TYPES.map((t) => `${t}: ${allowedKeys(t).join(", ")}`).join("\n");
}

export function qualifyUserPrompt(o: RawOpportunity): string {
  const budget =
    o.budgetMax != null ? `${o.budgetMin ?? o.budgetMax}–${o.budgetMax} ${o.currency ?? ""}` : "не указан";
  return `Каталог типов и ключей опций:
${catalogText()}

Источник: ${o.source} ${o.tags?.join(", ") ?? ""}
Заказчик: ${o.buyer ?? "—"} · Страна: ${o.country ?? "—"}
Бюджет заказчика: ${budget}
Дедлайн подачи: ${o.deadline ?? "—"}
Заголовок: ${o.title}
Текст:
"""${o.description.slice(0, 6000)}"""`;
}

/** Модель не расширяет каталог: чужой тип → other, чужие ключи → прочь. */
export function sanitizeQualification(
  q: z.infer<typeof qualificationSchema>,
): z.infer<typeof qualificationSchema> {
  const type: ProjectType = isProjectType(q.project_type) ? q.project_type : "other";
  const allowed = new Set(allowedKeys(type));
  return {
    ...q,
    project_type: type,
    fit_score: Math.max(0, Math.min(100, Math.round(q.fit_score))),
    feature_keys: q.feature_keys.filter((k) => allowed.has(k)),
  };
}

const has = (text: string, ...words: string[]) => words.some((w) => text.includes(w));

/**
 * Эвристика без модели: оценка от числа хитов префильтра, тип проекта по
 * словарю. Грубо, но конвейер не встаёт, если ключа нет или модель упала.
 */
export function heuristicQualification(o: RawOpportunity, pf: PrefilterResult): Qualification {
  const text = `${o.title}\n${o.description}`.toLowerCase();
  let project_type: ProjectType = "website";
  const keys: string[] = [];
  if (has(text, "telegram bot", "телеграм-бот", "telegram-бот", "bot kerak", "чат-бот", "chatbot", "chat bot")) {
    project_type = /(?<![\p{L}])(ai|gpt|llm|ии)(?![\p{L}])|нейросет/u.test(text) ? "ai" : "automation";
    keys.push(project_type === "ai" ? "aiChatbot" : "telegram");
  } else if (has(text, "mobile app", "мобильное приложение", "mobil ilova", "ios", "android")) {
    project_type = "mobileApp";
  } else if (has(text, "web app", "веб-приложение", "mvp", "saas", "platform", "платформ", "личный кабинет", "dashboard")) {
    project_type = "webApp";
    keys.push("personalAccount", "adminPanel");
  } else if (has(text, "интернет-магазин", "e-commerce", "ecommerce", "online store", "internet do'kon")) {
    keys.push("ecommerce");
  } else if (has(text, "landing", "лендинг")) {
    keys.push("landing");
  } else {
    keys.push("corporate");
  }
  if (has(text, "crm", "amocrm", "bitrix")) keys.push("crmIntegration", "apiIntegration");
  if (has(text, "payme", "click", "uzum")) keys.push("paymeClickUzum");

  const cyr = (text.match(/[а-яё]/g) ?? []).length;
  const uz = /\b(sayt|kerak|uchun|va|bilan|ilova)\b/.test(text);
  const reply_language = cyr > 20 ? "ru" : uz ? "uz" : "en";
  const fit = Math.min(85, 35 + pf.hits.length * 10);
  const email = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i.exec(o.description)?.[0] ?? null;
  const tg = /(?<![\w@])@[a-z0-9_]{5,32}\b/i.exec(o.description)?.[0] ?? null;

  return {
    ...sanitizeQualification({
      fit_score: fit,
      verdict: fit >= 60 ? "maybe" : "no",
      summary: `Оценка без ИИ по ключевым словам: ${pf.hits.slice(0, 6).join(", ") || "—"}. Проверь текст вручную.`,
      client_need: o.title,
      deliverables: [],
      project_type,
      feature_keys: keys,
      required_stack: [],
      risks: [],
      questions: [],
      reply_language,
      submission_channel:
        o.source === "telegram" ? "telegram" : o.source === "worldbank" ? "email" : o.source === "ingest" ? "unknown" : "platform",
      submission_how: "Открой ссылку на источник — способ подачи указан там.",
      contact: email ?? tg,
    }),
    by: "heuristic",
  };
}
