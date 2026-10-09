import { createHash, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/server";
import { answerTelegramCallback, isTrustedSender, replyTelegram } from "@/lib/telegram";
import { applyAction } from "@/lib/pipeline/actions";
import { extractOpportunities } from "@/lib/pipeline/ai";
import { parseCallback } from "@/lib/pipeline/card";
import { ingestNow, runPipeline } from "@/lib/pipeline/run";

/**
 * Вебхук бота чата лидов (ADR 0004):
 *  — кнопки карточек (callback pl:<действие>:<id>);
 *  — пересланный владельцем заказ из любого чата → сразу в конвейер, без
 *    отсева (владелец уже решил, что смотреть);
 *  — /run — внеочередной прогон, /pipeline — короткая сводка.
 * Принимаются только апдейты с X-Telegram-Bot-Api-Secret-Token и только от
 * чата лидов или лички владельца (TELEGRAM_OWNER_ID).
 */
export const runtime = "nodejs";
export const maxDuration = 120;

interface TgUpdate {
  callback_query?: {
    id: string;
    data?: string;
    from?: { id: number };
    message?: { chat?: { id: number; type?: string } };
  };
  message?: {
    message_id: number;
    text?: string;
    caption?: string;
    chat: { id: number; type?: string };
    from?: { id: number };
    forward_origin?: { type?: string; chat?: { username?: string; title?: string }; sender_user?: { username?: string } };
  };
}

function authorized(req: Request): boolean {
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!secret) return false;
  const got = Buffer.from(req.headers.get("x-telegram-bot-api-secret-token") ?? "");
  const want = Buffer.from(secret);
  return got.length === want.length && timingSafeEqual(got, want);
}

export async function POST(req: Request): Promise<NextResponse> {
  if (!authorized(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!isSupabaseConfigured()) return NextResponse.json({ ok: true });
  const update = (await req.json().catch(() => ({}))) as TgUpdate;
  const db = getSupabaseAdmin();

  // Кнопки карточек.
  const cq = update.callback_query;
  if (cq) {
    const chat = cq.message?.chat;
    if (!isTrustedSender(chat?.id, cq.from?.id, chat?.type)) {
      await answerTelegramCallback(cq.id, "Нет доступа");
      return NextResponse.json({ ok: true });
    }
    const parsed = parseCallback(cq.data);
    if (!parsed) {
      await answerTelegramCallback(cq.id, "Неизвестная кнопка");
      return NextResponse.json({ ok: true });
    }
    const res = await applyAction(db, parsed.id, parsed.action);
    await answerTelegramCallback(cq.id, res.message.slice(0, 190));
    return NextResponse.json({ ok: true });
  }

  const msg = update.message;
  if (!msg || !isTrustedSender(msg.chat.id, msg.from?.id, msg.chat.type)) return NextResponse.json({ ok: true });
  const text = (msg.text ?? msg.caption ?? "").trim();
  if (!text) return NextResponse.json({ ok: true });

  if (/^\/run\b/.test(text)) {
    const s = await runPipeline(db, { trigger: "manual", force: true });
    await replyTelegram(
      msg.chat.id,
      `Прогон: найдено ${s.inserted} новых, на решение ${s.review}, карточек ${s.notified}` +
        (Object.keys(s.errors).length ? `\nОшибки: ${Object.keys(s.errors).join(", ")}` : ""),
    );
    return NextResponse.json({ ok: true });
  }
  if (/^\/pipeline\b/.test(text)) {
    const { data } = await db.from("opportunities").select("status").in("status", ["review", "applying", "submitted"]);
    const by: Record<string, number> = {};
    for (const r of data ?? []) by[r.status as string] = (by[r.status as string] ?? 0) + 1;
    await replyTelegram(
      msg.chat.id,
      `На решении: ${by.review ?? 0} · подаюсь: ${by.applying ?? 0} · отправлено: ${by.submitted ?? 0}`,
    );
    return NextResponse.json({ ok: true });
  }
  if (text.startsWith("/")) return NextResponse.json({ ok: true });

  // Пересланный заказ / вставленный текст → в конвейер.
  const fo = msg.forward_origin;
  const from = fo?.chat?.username ? `@${fo.chat.username}` : fo?.chat?.title ?? fo?.sender_user?.username ?? "telegram";
  const items = await extractOpportunities({ text, from });
  const base = createHash("sha1").update(text).digest("hex").slice(0, 16);
  const stats = await ingestNow(
    db,
    items.map((it, i) => ({ ...it, source: "ingest" as const, externalId: `tg:${base}:${i}`, tags: [from] })),
    { forceReview: true },
  );
  await replyTelegram(
    msg.chat.id,
    stats.inserted
      ? `Принято: ${stats.inserted} шт. Карточки — в чате лидов.`
      : stats.duplicates
        ? "Это уже есть в конвейере."
        : "В сообщении не нашлось заказа.",
  );
  return NextResponse.json({ ok: true });
}
