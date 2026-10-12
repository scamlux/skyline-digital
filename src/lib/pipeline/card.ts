import { esc, type InlineKeyboard } from "@/lib/telegram";
import { typeLabelRu } from "./labels";
import { formatQuote } from "./quote";
import type { Draft } from "./draft";
import type { OpportunityRow, OpportunityStatus } from "./types";

/**
 * Telegram-карточка возможности и её кнопки. Чистые функции — тестируются
 * без сети. callback_data: `pl:<действие>:<uuid>` (≤ 64 байт).
 */

export const ACTIONS = ["go", "skip", "text", "sent", "won", "lost"] as const;
export type CardAction = (typeof ACTIONS)[number];

export const ACTION_STATUS: Record<CardAction, OpportunityStatus | null> = {
  go: "applying",
  skip: "dismissed",
  text: null, // только прислать текст, статус не меняется
  sent: "submitted",
  won: "won",
  lost: "lost",
};

export function parseCallback(data: unknown): { action: CardAction; id: string } | null {
  const m = /^pl:([a-z]+):([0-9a-f-]{36})$/.exec(String(data ?? ""));
  if (!m || !(ACTIONS as readonly string[]).includes(m[1])) return null;
  return { action: m[1] as CardAction, id: m[2] };
}

const SOURCE_LABEL: Record<string, string> = {
  worldbank: "Всемирный банк",
  reddit: "Reddit",
  telegram: "Telegram",
  rss: "RSS",
  freelancehunt: "Freelancehunt",
  ingest: "Оповещение",
};

function fmtDate(iso: string, now: Date): string {
  const d = new Date(iso);
  const days = Math.round((d.getTime() - now.getTime()) / 86_400_000);
  const date = d.toLocaleDateString("ru-RU", { timeZone: "Asia/Tashkent", day: "2-digit", month: "2-digit" });
  return days >= 0 ? `${date} (через ${days} дн.)` : `${date} (прошёл)`;
}

export function formatCard(o: OpportunityRow, now = new Date()): string {
  const q = o.qualification;
  const verdict = q ? { go: "🟢 подаваться", maybe: "🟡 посмотреть", no: "🔴 не наше" }[q.verdict] : "";
  const budget =
    o.budget_max != null
      ? `${o.budget_min != null && o.budget_min !== o.budget_max ? `${o.budget_min}–` : ""}${o.budget_max} ${o.currency ?? ""}`.trim()
      : "не указан";
  const lines = [
    `🎯 <b>${esc(o.title)}</b>`,
    `⭐ ${o.score ?? "—"}/100 · ${verdict} · ${esc(SOURCE_LABEL[o.source] ?? o.source)}${o.country ? ` · ${esc(o.country)}` : ""}`,
    o.buyer ? `🏢 ${esc(o.buyer)}` : "",
    `💰 Бюджет заказчика: ${esc(budget)}`,
    o.quote ? `🧮 Наша оценка: ${esc(formatQuote(o.quote))} · ${esc(typeLabelRu(o.quote.projectType))}` : "",
    o.deadline ? `⏰ Дедлайн: ${esc(fmtDate(o.deadline, now))}` : "",
    q?.summary ? `\n${esc(q.summary)}` : "",
    q?.risks?.length ? `\n⚠️ ${esc(q.risks.slice(0, 2).join(" · "))}` : "",
    q?.submission_how ? `📤 ${esc(q.submission_how)}` : "",
    q?.contact ? `✉️ ${esc(q.contact)}` : "",
    q?.by === "heuristic" ? "<i>Оценка без ИИ — проверь вручную.</i>" : "",
  ];
  const text = lines.filter(Boolean).join("\n");
  return text.length > 3800 ? `${text.slice(0, 3790)}…` : text;
}

export function keyboardFor(o: Pick<OpportunityRow, "id" | "status" | "url">): InlineKeyboard {
  const cb = (a: CardAction) => `pl:${a}:${o.id}`;
  // Telegram отклоняет всё сообщение целиком, если url кнопки не http(s).
  const open: InlineKeyboard = o.url && /^https?:\/\/[^\s]+$/i.test(o.url) ? [[{ text: "🔗 Открыть", url: o.url }]] : [];
  switch (o.status) {
    case "review":
      return [
        [
          { text: "✅ Подаюсь", callback_data: cb("go") },
          { text: "❌ Мимо", callback_data: cb("skip") },
        ],
        [{ text: "📝 Текст отклика", callback_data: cb("text") }],
        ...open,
      ];
    case "applying":
    case "submitted":
      return [
        [
          ...(o.status === "applying" ? [{ text: "📤 Отправлено", callback_data: cb("sent") }] : []),
          { text: "🏆 Выиграли", callback_data: cb("won") },
          { text: "💤 Не взяли", callback_data: cb("lost") },
        ],
        [{ text: "📝 Текст отклика", callback_data: cb("text") }],
        ...open,
      ];
    default:
      return open;
  }
}

const KIND_LABEL: Record<Draft["kind"], string> = {
  cover_letter: "Отклик на бирже",
  eoi: "EOI / заявка",
  chat_reply: "Ответ в чат",
  email: "Письмо",
};

/** Текст отклика отдельным сообщением: <pre> копируется в Telegram одним тапом. */
export function formatDraftMessage(o: Pick<OpportunityRow, "title">, d: Draft): string {
  const parts = [
    `📝 <b>${esc(KIND_LABEL[d.kind])}</b> · ${d.language.toUpperCase()}${d.by === "template" ? " · шаблон" : ""}`,
    `<i>${esc(o.title)}</i>`,
    d.subject ? `Тема: ${esc(d.subject)}` : "",
    `<pre>${esc(d.text)}</pre>`,
    d.checklist.length ? `Перед отправкой:\n${d.checklist.map((c) => `• ${esc(c)}`).join("\n")}` : "",
  ];
  return parts.filter(Boolean).join("\n\n").slice(0, 4000);
}
