import { z } from "zod";
import { formatQuote } from "./quote";
import type { Qualification } from "./qualify";
import type { Quote, RawOpportunity } from "./types";

/**
 * Черновик отклика: сопроводительное письмо для биржи, EOI для тендера,
 * ответ в Telegram. Владелец копирует и отправляет сам — площадки (Upwork,
 * LinkedIn) запрещают автоматическую подачу, а тендерам нужна подпись
 * (ADR 0004).
 *
 * Правила текста — из docs/smm/brain.md: спокойно, конкретно, без «под ключ»
 * и восклицаний; ни одного факта и цифры, которых нет во входе.
 */

export const draftSchema = z.object({
  kind: z.enum(["cover_letter", "eoi", "chat_reply", "email"]),
  subject: z.string().nullable(),
  text: z.string(),
  checklist: z.array(z.string()).max(6),
});

export type Draft = z.infer<typeof draftSchema> & {
  language: "ru" | "uz" | "en";
  by: "ai" | "template";
};

export interface PortfolioCase {
  title: string;
  description: string;
  url?: string | null;
}

export const DRAFT_SYSTEM = `Ты пишешь отклик от имени владельца веб-студии Skyline Digital (Ташкент, GMT+5).
Правила:
- язык ответа — указанный во входе;
- 90–180 слов для биржи и Telegram, до 250 для EOI/письма;
- первая фраза — про задачу клиента, не про нас; без приветственной воды, без «под ключ», без восклицаний;
- 1–2 релевантных кейса ТОЛЬКО из присланного портфолио, со ссылкой, если она есть;
- конкретный план из 3 шагов и один уточняющий вопрос в конце;
- цену называй ТОЛЬКО строкой из поля «Наша оценка», дословно; никаких других цифр, метрик, сроков и обещаний;
- не выдумывай опыт, сертификаты, команду и отзывы.
kind: cover_letter (биржа), eoi (тендер/консультант), chat_reply (Telegram/Reddit), email (ответ на письмо).
checklist: что приложить или сделать перед отправкой (CV, ссылки на кейсы, форма площадки).`;

export function draftUserPrompt(
  o: RawOpportunity,
  q: Qualification,
  quote: Quote | null,
  portfolio: PortfolioCase[],
): string {
  const cases = portfolio
    .slice(0, 8)
    .map((p) => `- ${p.title}: ${p.description}${p.url ? ` (${p.url})` : ""}`)
    .join("\n");
  return `Язык ответа: ${q.reply_language}
Канал подачи: ${q.submission_channel} — ${q.submission_how}
Что нужно клиенту: ${q.client_need}
Результаты работы: ${q.deliverables.join("; ") || "—"}
Уточняющие вопросы (выбери один): ${q.questions.join(" | ") || "—"}
Наша оценка: ${quote ? formatQuote(quote) : "не называть цену, предложить созвон"}

Портфолио:
${cases || "—"}

Заказ:
Заголовок: ${o.title}
"""${o.description.slice(0, 5000)}"""`;
}

const KIND_BY_CHANNEL: Record<Qualification["submission_channel"], Draft["kind"]> = {
  platform: "cover_letter",
  email: "eoi",
  portal: "eoi",
  telegram: "chat_reply",
  unknown: "cover_letter",
};

/** Шаблон без модели: структура та же, текст общий — владелец допишет. */
export function templateDraft(
  o: RawOpportunity,
  q: Qualification,
  quote: Quote | null,
  portfolio: PortfolioCase[],
): Draft {
  const caseLine = portfolio[0]
    ? `${portfolio[0].title}${portfolio[0].url ? ` — ${portfolio[0].url}` : ""}`
    : "skyline-digital.uz";
  const price = quote ? formatQuote(quote) : null;
  const t = {
    ru: [
      `Здравствуйте. По задаче «${o.title}» — коротко, как мы бы её сделали.`,
      `Похожая работа: ${caseLine}.`,
      `Предлагаю так: 1) короткий созвон и уточнение объёма; 2) прототип ключевого сценария; 3) разработка, тесты и запуск.`,
      price ? `Предварительная оценка по нашему калькулятору: ${price}.` : "",
      `Skyline Digital, Ташкент. Next.js, Supabase, ИИ-интеграции; русский, узбекский, английский.`,
      `Какой срок запуска для вас критичен?`,
    ],
    uz: [
      `Assalomu alaykum. «${o.title}» vazifasini ko'rib chiqdim.`,
      `O'xshash ish: ${caseLine}.`,
      `Taklif: 1) qisqa qo'ng'iroq va hajmni aniqlash; 2) asosiy ssenariy prototipi; 3) ishlab chiqish, test va ishga tushirish.`,
      price ? `Kalkulyatorimiz bo'yicha dastlabki baho: ${price}.` : "",
      `Skyline Digital, Toshkent. Next.js, Supabase, AI integratsiyalar.`,
      `Ishga tushirish muddati siz uchun qanchalik muhim?`,
    ],
    en: [
      `Hi, I read through "${o.title}".`,
      `Similar work: ${caseLine}.`,
      `How I'd approach it: 1) a short call to pin down scope; 2) a prototype of the key flow; 3) build, test and launch.`,
      price ? `Preliminary estimate from our pricing calculator: ${price}.` : "",
      `Skyline Digital, Tashkent (GMT+5). Next.js, Supabase, AI integrations; English, Russian, Uzbek.`,
      `What launch date are you aiming for?`,
    ],
  }[q.reply_language];
  return {
    kind: KIND_BY_CHANNEL[q.submission_channel],
    subject: q.submission_channel === "email" || q.submission_channel === "portal" ? o.title : null,
    text: t.filter(Boolean).join("\n\n"),
    checklist:
      q.submission_channel === "email" || q.submission_channel === "portal"
        ? ["CV в формате заказчика", "Ссылки на 2–3 кейса", "Проверить требования TOR перед отправкой"]
        : ["Ссылка на портфолио", "Проверить бюджет и сроки заказчика"],
    language: q.reply_language,
    by: "template",
  };
}
