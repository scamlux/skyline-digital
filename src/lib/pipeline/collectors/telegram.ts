import { fetchHtml } from "@/lib/radar/collectors/http";
import type { RawOpportunity } from "../types";
import { clip, htmlToText, parseBudget, toIso } from "./util";

/**
 * Публичные Telegram-каналы через веб-превью t.me/s/<канал> — без бота,
 * без userbot и без входа в аккаунт. Закрытые чаты так не читаются: их
 * владелец пересылает боту вручную (route /api/telegram/webhook → ingest).
 */

export function parseTelegramChannel(html: string, channel: string): RawOpportunity[] {
  const out: RawOpportunity[] = [];
  // Каждое сообщение — блок с data-post="channel/123".
  const blocks = html.split(/(?=<div[^>]+class="tgme_widget_message[ "])/);
  for (const b of blocks) {
    const post = /data-post="([^"]+)"/.exec(b)?.[1];
    if (!post) continue;
    const textHtml = /<div class="tgme_widget_message_text[^"]*"[^>]*>([\s\S]*?)<\/div>/.exec(b)?.[1];
    if (!textHtml) continue;
    const text = htmlToText(textHtml);
    if (text.length < 20) continue;
    const firstLine = text.split("\n")[0] ?? text;
    const budget = parseBudget(text);
    out.push({
      source: "telegram",
      externalId: post,
      url: `https://t.me/${post}`,
      title: clip(firstLine, 140),
      description: text,
      budgetMin: budget?.min ?? null,
      budgetMax: budget?.max ?? null,
      currency: budget?.currency ?? null,
      publishedAt: toIso(/<time[^>]+datetime="([^"]+)"/.exec(b)?.[1]),
      tags: [`@${channel}`],
    });
  }
  return out;
}

export async function collectTelegram(
  channels: string[],
  fetchImpl?: typeof fetch,
): Promise<RawOpportunity[]> {
  const out: RawOpportunity[] = [];
  for (const ch of channels) {
    const res = await fetchHtml(`https://t.me/s/${encodeURIComponent(ch)}`, { fetchImpl });
    if (!res.ok) throw new Error(`telegram @${ch}: HTTP ${res.status}`);
    out.push(...parseTelegramChannel(res.html, ch));
  }
  return out;
}
