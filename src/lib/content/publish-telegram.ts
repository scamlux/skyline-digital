import type { SupabaseClient } from "@supabase/supabase-js";
import { signedRenderUrls, type ContentPostRow } from "./store";

/**
 * Публикация в Telegram-канал (ТЗ §7.1 — «Telegram делать первым»).
 * sendMediaGroup для карусели (2–10), sendPhoto для одиночной. Подпись в
 * медиа-группе ≤ 1024 симв. — если длиннее, картинки группой и текст
 * отдельным сообщением, external_id — ID первого.
 *
 * Секреты: TELEGRAM_BOT_TOKEN + TELEGRAM_CHANNEL_ID (канал ≠ чат лидов).
 */

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHANNEL = process.env.TELEGRAM_CHANNEL_ID;

export function isChannelConfigured(): boolean {
  return Boolean(TOKEN && CHANNEL);
}

async function tg(method: string, body: Record<string, unknown>) {
  const res = await fetch(`https://api.telegram.org/bot${TOKEN}/${method}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ chat_id: CHANNEL, ...body }),
  });
  const json = (await res.json()) as {
    ok: boolean;
    result?: { message_id?: number }[] | { message_id?: number };
    description?: string;
  };
  if (!json.ok) throw new Error(`telegram ${method}: ${json.description}`);
  return json.result;
}

export async function publishToTelegram(
  db: SupabaseClient,
  post: ContentPostRow,
): Promise<{ ok: boolean; permalink?: string; error?: string }> {
  if (!isChannelConfigured()) {
    return { ok: false, error: "TELEGRAM_BOT_TOKEN / TELEGRAM_CHANNEL_ID не заданы" };
  }
  // Идемпотентность: уже опубликовано → выходим (уникальный индекс в БД —
  // вторая линия обороны).
  const { data: prev } = await db
    .from("content_publications")
    .select("id")
    .eq("post_id", post.id)
    .eq("platform", "telegram")
    .eq("status", "published")
    .maybeSingle();
  if (prev) return { ok: false, error: "уже опубликовано в telegram" };

  const { data: pub } = await db
    .from("content_publications")
    .insert({ post_id: post.id, platform: "telegram", status: "pending" })
    .select("id")
    .single();
  const pubId = (pub as { id: string }).id;

  try {
    const urls = await signedRenderUrls(db, post);
    if (!urls.length) throw new Error("нет рендеров — сначала отрендерить");
    const caption = `${post.caption.telegram ?? post.caption.default ?? ""}`.trim();
    const short = caption.length <= 1024;

    let messageId: number | undefined;
    if (urls.length === 1) {
      const r = (await tg("sendPhoto", {
        photo: urls[0],
        ...(short && caption ? { caption } : {}),
      })) as { message_id?: number };
      messageId = r.message_id;
    } else {
      const media = urls.slice(0, 10).map((u, i) => ({
        type: "photo",
        media: u,
        ...(i === 0 && short && caption ? { caption } : {}),
      }));
      const r = (await tg("sendMediaGroup", { media })) as { message_id?: number }[];
      messageId = r?.[0]?.message_id;
    }
    if (!short && caption) await tg("sendMessage", { text: caption });

    const channelSlug = String(CHANNEL).replace(/^@/, "");
    const permalink = messageId ? `https://t.me/${channelSlug}/${messageId}` : undefined;
    await db
      .from("content_publications")
      .update({
        status: "published",
        external_id: messageId ? String(messageId) : null,
        permalink,
        published_at: new Date().toISOString(),
      })
      .eq("id", pubId);
    await db.from("content_posts").update({ status: "published" }).eq("id", post.id);
    return { ok: true, permalink };
  } catch (e) {
    await db
      .from("content_publications")
      .update({ status: "failed", error: String(e) })
      .eq("id", pubId);
    await db.from("content_posts").update({ status: "failed" }).eq("id", post.id);
    return { ok: false, error: String(e) };
  }
}
