import type { SupabaseClient } from "@supabase/supabase-js";
import { publishToTelegram } from "./publish-telegram";
import { publishToInstagram } from "./publish-instagram";
import { telegramChannelReady, instagramReady } from "./diagnostics";
import { signedRenderUrls, type ContentPostRow } from "./store";
import { toTashkentDisplay } from "./tz";

/**
 * Оркестратор публикации одного поста (ПРОМПТ-3 §1.4/§1.5). Вызывается кроном.
 *
 * Площадки с настроенным API (telegram-канал, instagram) публикуются сразу.
 * Всё остальное — facebook/linkedin/threads, а также telegram/instagram без
 * ключей — уходит в очередь ручных напоминаний: крон шлёт в чат лидов заголовок,
 * площадку, время, ссылку на пост, ссылки на картинки и текст подписи для
 * копирования, и заводит строку publication со статусом `manual`. Человек
 * публикует руками и жмёт «Опубликовано вручную».
 *
 * Молчаливый отказ исключён: если нет ключей — это видно в «Диагностике», а
 * незапощенная площадка всё равно порождает напоминание, а не тишину.
 */

const API_PLATFORMS = new Set(["telegram", "instagram"]);

function baseUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return explicit.replace(/\/$/, "");
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "";
}

function apiReady(platform: string): boolean {
  if (platform === "telegram") return telegramChannelReady();
  if (platform === "instagram") return instagramReady();
  return false;
}

async function sendLeadsReminder(text: string): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chat = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chat) return false;
  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ chat_id: chat, text, disable_web_page_preview: true }),
  });
  return res.ok;
}

/** Одноразовое напоминание о ручной публикации + строка publication `manual`. */
async function manualReminder(
  db: SupabaseClient,
  post: ContentPostRow,
  platform: string,
): Promise<void> {
  // Уже есть строка по этой площадке → напоминание слали, повторно не спамим.
  const { data: existing } = await db
    .from("content_publications")
    .select("id")
    .eq("post_id", post.id)
    .eq("platform", platform)
    .limit(1)
    .maybeSingle();
  if (existing) return;

  const urls = await signedRenderUrls(db, post, 3600).catch(() => [] as string[]);
  const caption =
    post.caption[platform as keyof typeof post.caption] ??
    post.caption.default ??
    post.caption.instagram ??
    "";
  const base = baseUrl();
  const link = `${base}/admin/content/${post.id}`;
  const when = toTashkentDisplay(post.scheduled_at);

  const text = [
    `📣 Ручная публикация: ${platform.toUpperCase()}`,
    `«${post.title}» · ${when} (Ташкент)`,
    link,
    "",
    urls.length ? `Картинки (${urls.length}):\n${urls.join("\n")}` : "⚠️ Картинки не отрендерены",
    "",
    "Подпись для копирования:",
    caption,
  ].join("\n");

  const sent = await sendLeadsReminder(text);
  await db.from("content_publications").insert({
    post_id: post.id,
    platform,
    status: "manual",
    error: sent ? null : "напоминание не отправлено — не задан TELEGRAM_CHAT_ID",
  });
}

export interface PublishResult {
  platform: string;
  ok: boolean;
  manual?: boolean;
  permalink?: string;
  error?: string;
}

/** Публикует все площадки поста и выставляет финальный статус. */
export async function publishDuePost(
  db: SupabaseClient,
  post: ContentPostRow,
): Promise<PublishResult[]> {
  const results: PublishResult[] = [];

  for (const platform of post.platforms) {
    if (API_PLATFORMS.has(platform) && apiReady(platform)) {
      const r =
        platform === "telegram"
          ? await publishToTelegram(db, post)
          : await publishToInstagram(db, post);
      results.push({ platform, ok: r.ok, permalink: r.permalink, error: r.error });
    } else {
      await manualReminder(db, post, platform);
      results.push({ platform, ok: true, manual: true });
    }
  }

  // Финальный статус — по фактическим строкам publications (устойчиво к
  // идемпотентным «уже опубликовано»). Пост покидает `scheduled` за один проход.
  const apiPlatforms = post.platforms.filter((p) => API_PLATFORMS.has(p) && apiReady(p));
  const { data: pubRows } = await db
    .from("content_publications")
    .select("platform,status")
    .eq("post_id", post.id);
  const rows = (pubRows ?? []) as { platform: string; status: string }[];
  const allApiPublished = apiPlatforms.every((p) =>
    rows.some((r) => r.platform === p && r.status === "published"),
  );
  const finalStatus =
    apiPlatforms.length === 0 ? "published" : allApiPublished ? "published" : "failed";
  await db.from("content_posts").update({ status: finalStatus }).eq("id", post.id);

  return results;
}
