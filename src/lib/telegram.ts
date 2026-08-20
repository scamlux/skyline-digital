import "server-only";

/**
 * Telegram Bot API integration. Server-side only — the token lives in
 * TELEGRAM_BOT_TOKEN and never reaches the client. All calls are best-effort:
 * they never throw, so a Telegram outage can't roll back a saved lead. On
 * failure they log and return an error result the caller can persist for retry.
 */

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

export function isTelegramConfigured(): boolean {
  return Boolean(TOKEN && CHAT_ID);
}

interface SendResult {
  ok: boolean;
  messageId?: number;
  error?: string;
}

function api(method: string): string {
  return `https://api.telegram.org/bot${TOKEN}/${method}`;
}

/** Escape text for Telegram HTML parse mode. */
export function esc(s: unknown): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/** Send an HTML message to the configured group. Never throws. */
export async function sendTelegramMessage(text: string): Promise<SendResult> {
  if (!isTelegramConfigured()) {
    console.warn("[telegram] not configured — skipping message");
    return { ok: false, error: "not_configured" };
  }
  try {
    const res = await fetch(api("sendMessage"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: CHAT_ID,
        text,
        parse_mode: "HTML",
        disable_web_page_preview: true,
      }),
    });
    const data = await res.json();
    if (!data.ok) {
      console.error("[telegram] sendMessage failed:", data.error_code, data.description);
      return { ok: false, error: `${data.error_code}: ${data.description}` };
    }
    return { ok: true, messageId: data.result?.message_id };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[telegram] sendMessage error:", msg);
    return { ok: false, error: msg };
  }
}

/**
 * Send a document (by public URL) with an HTML caption. Telegram fetches the
 * file itself, so the URL must be publicly reachable (< 20MB). Never throws.
 */
export async function sendTelegramDocument(
  documentUrl: string,
  caption: string,
): Promise<SendResult> {
  if (!isTelegramConfigured()) {
    console.warn("[telegram] not configured — skipping document");
    return { ok: false, error: "not_configured" };
  }
  try {
    const res = await fetch(api("sendDocument"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: CHAT_ID,
        document: documentUrl,
        caption,
        parse_mode: "HTML",
      }),
    });
    const data = await res.json();
    if (!data.ok) {
      console.error("[telegram] sendDocument failed:", data.error_code, data.description);
      return { ok: false, error: `${data.error_code}: ${data.description}` };
    }
    return { ok: true, messageId: data.result?.message_id };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[telegram] sendDocument error:", msg);
    return { ok: false, error: msg };
  }
}

/** A single labelled line; returns "" when the value is empty (so it's skipped). */
function line(label: string, value: unknown): string {
  const v = String(value ?? "").trim();
  return v ? `${label}: ${esc(v)}\n` : "";
}

/** Optional multi-line block (e.g. description) — omitted when empty. */
function block(value: unknown): string {
  const v = String(value ?? "").trim();
  return v ? `${esc(v)}\n` : "";
}

export interface LeadForTelegram {
  lead_number: string;
  client_name?: string | null;
  company?: string | null;
  phone?: string | null;
  email?: string | null;
  telegram?: string | null;
  project_type?: string | null;
  service?: string | null;
  description?: string | null;
  budget?: string | null;
  calculated_price?: number | null;
  currency?: string | null;
  deadline?: string | null;
  source?: string | null;
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
  utm_content?: string | null;
  landing_page?: string | null;
  ai_summary?: string | null;
  created_at?: string | null;
}

/** "NEW LEAD" notification. Empty fields are dropped entirely. */
export function formatLeadMessage(lead: LeadForTelegram): string {
  const created = lead.created_at
    ? new Date(lead.created_at).toLocaleString("ru-RU", { timeZone: "Asia/Tashkent" })
    : new Date().toLocaleString("ru-RU", { timeZone: "Asia/Tashkent" });

  const price =
    lead.calculated_price != null
      ? `${Math.round(lead.calculated_price).toLocaleString("en-US")} ${lead.currency ?? "USD"}`
      : lead.budget;

  const client =
    line("Имя", lead.client_name) +
    line("Компания", lead.company) +
    line("Телефон", lead.phone) +
    line("Email", lead.email) +
    line("Telegram", lead.telegram);

  const project =
    line("Тип", lead.project_type) +
    line("Услуга", lead.service) +
    (lead.description ? `Описание:\n${block(lead.description)}` : "");

  const source =
    line("Source", lead.source) +
    line("UTM Source", lead.utm_source) +
    line("UTM Medium", lead.utm_medium) +
    line("UTM Campaign", lead.utm_campaign) +
    line("UTM Content", lead.utm_content) +
    line("Landing page", lead.landing_page);

  let msg = `🔥 <b>NEW LEAD #${esc(lead.lead_number)}</b>\n`;
  if (client.trim()) msg += `\n👤 <b>КЛИЕНТ</b>\n${client}`;
  if (project.trim()) msg += `\n🎯 <b>ПРОЕКТ</b>\n${project}`;
  if (price) msg += `\n💰 <b>БЮДЖЕТ</b>\n${esc(price)}\n`;
  if (lead.deadline) msg += `\n⏱ <b>СРОК</b>\n${esc(lead.deadline)}\n`;
  if (source.trim()) msg += `\n📊 <b>ИСТОЧНИК</b>\n${source}`;
  if (lead.ai_summary) msg += `\n🤖 <b>AI SUMMARY</b>\n${block(lead.ai_summary)}`;
  msg += `\n📅 Создано:\n${esc(created)}\n`;
  msg += `\nСтатус: <b>NEW</b>`;
  return msg;
}

export interface ProposalForTelegram {
  lead_number: string;
  client_name?: string | null;
  project_type?: string | null;
  service?: string | null;
  total_price?: number | null;
  currency?: string | null;
  deadline?: string | null;
  package?: string | null;
  ai_summary?: string | null;
  version: number;
  created_at?: string | null;
}

/** Caption for the "КП СОЗДАНО" document message. */
export function formatProposalMessage(p: ProposalForTelegram): string {
  const created = p.created_at
    ? new Date(p.created_at).toLocaleString("ru-RU", { timeZone: "Asia/Tashkent" })
    : new Date().toLocaleString("ru-RU", { timeZone: "Asia/Tashkent" });
  const price =
    p.total_price != null
      ? `${Math.round(p.total_price).toLocaleString("en-US")} ${p.currency ?? "USD"}`
      : "";

  let msg = `📄 <b>КП СОЗДАНО</b>\n\nLead: #${esc(p.lead_number)}\n`;
  if (p.client_name) msg += `\n👤 Клиент:\n${esc(p.client_name)}\n`;
  const project = line("Тип", p.project_type) + line("Услуга", p.service);
  if (project.trim()) msg += `\n🎯 Проект:\n${project}`;
  if (price) msg += `\n💰 Стоимость:\n${esc(price)}\n`;
  if (p.deadline) msg += `\n⏱ Срок:\n${esc(p.deadline)}\n`;
  if (p.package) msg += `\n📦 Пакет:\n${esc(p.package)}\n`;
  if (p.ai_summary) msg += `\n🤖 AI Summary:\n${block(p.ai_summary)}`;
  msg += `\nВерсия: v${p.version}\nДата: ${esc(created)}`;
  return msg;
}
