import { createHash, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { rateLimit } from "@/lib/rate-limit";
import { formatDigest, formatHelp } from "@/lib/telegram-digest/format";
import { sendDigestMessage } from "@/lib/telegram-digest/send";
import { digestFromText, updateSchema } from "@/lib/telegram-digest/update";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Вебхук демо-бота «Сводка в Telegram» (кабинеты шаблонов /sites/<ниша>/admin).
 * Отдельный бот и отдельные env (TELEGRAM_DIGEST_*) — бот заявок (TELEGRAM_BOT_TOKEN) не трогаем.
 * Данных не храним: chat id живёт только в ключе лимитера в памяти/Redis на время окна.
 */

const SECRET_HEADER = "x-telegram-bot-api-secret-token";
const MAX_BODY_BYTES = 16_384;
const CHAT_LIMIT = 5;
const CHAT_WINDOW_MS = 10 * 60_000;

/** Сравнение без утечки по времени: хэшируем обе строки до равной длины и сравниваем хэши. */
function safeEqual(a: string, b: string): boolean {
  const ha = createHash("sha256").update(a).digest();
  const hb = createHash("sha256").update(b).digest();
  return timingSafeEqual(ha, hb);
}

const ok = () => NextResponse.json({ ok: true });

export async function POST(request: Request) {
  const secret = process.env.TELEGRAM_DIGEST_WEBHOOK_SECRET;
  const token = process.env.TELEGRAM_DIGEST_BOT_TOKEN;
  // Без секрета проверять нечем: не настроено. Статус настройки раньше проверки секрета не раскрываем.
  if (!secret) return NextResponse.json({ error: "Not configured" }, { status: 503 });

  if (!safeEqual(request.headers.get(SECRET_HEADER) ?? "", secret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!token) return NextResponse.json({ error: "Not configured" }, { status: 503 });

  const raw = await request.text();
  if (raw.length > MAX_BODY_BYTES) return NextResponse.json({ error: "Payload too large" }, { status: 413 });

  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Дальше всегда 200: иначе Telegram будет повторять один и тот же апдейт.
  const parsed = updateSchema.safeParse(json);
  const message = parsed.success ? parsed.data.message : undefined;
  if (!message || message.chat.type !== "private") return ok();

  if (!(await rateLimit(`tg-digest:${message.chat.id}`, { limit: CHAT_LIMIT, windowMs: CHAT_WINDOW_MS }))) {
    console.warn("[telegram-digest] rate limit hit");
    return ok();
  }

  const payload = digestFromText(message.text);
  await sendDigestMessage(token, message.chat.id, payload ? formatDigest(payload) : formatHelp());
  return ok();
}
