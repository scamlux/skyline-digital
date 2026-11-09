#!/usr/bin/env node
/**
 * Вебхук демо-бота «Сводка в Telegram» (отдельный бот, НЕ бот заявок).
 *
 *   TELEGRAM_DIGEST_BOT_TOKEN=… TELEGRAM_DIGEST_WEBHOOK_SECRET=… node scripts/telegram/set-digest-webhook.mjs
 *   … node scripts/telegram/set-digest-webhook.mjs --info     # getWebhookInfo
 *   … node scripts/telegram/set-digest-webhook.mjs --delete   # deleteWebhook
 *
 * Токен и секрет читаются только из env (не из аргументов) и нигде не печатаются.
 * Скрипт вызывает setWebhook только для TELEGRAM_DIGEST_BOT_TOKEN и откажется работать,
 * если он совпал с TELEGRAM_BOT_TOKEN (бот заявок) из окружения.
 */

const WEBHOOK_URL = "https://skyline-digital.uz/api/telegram/digest";
const ALLOWED_UPDATES = ["message"];
const TIMEOUT_MS = 15_000;
/** Ограничение Telegram на secret_token: 1–256 символов из [A-Za-z0-9_-]. */
const SECRET_PATTERN = /^[A-Za-z0-9_-]{1,256}$/;

const token = process.env.TELEGRAM_DIGEST_BOT_TOKEN ?? "";
const secret = process.env.TELEGRAM_DIGEST_WEBHOOK_SECRET ?? "";
const args = process.argv.slice(2);
const mode = args.includes("--info") ? "info" : args.includes("--delete") ? "delete" : "set";
const unknown = args.filter((a) => a !== "--info" && a !== "--delete");

function fail(message) {
  console.error(`Ошибка: ${message}`);
  process.exit(1);
}

if (unknown.length > 0) fail(`неизвестные аргументы: ${unknown.join(" ")}. Токен и секрет задаются только через env.`);
if (args.includes("--info") && args.includes("--delete")) fail("--info и --delete вместе не используются.");
if (!token) fail("не задан TELEGRAM_DIGEST_BOT_TOKEN.");
if (process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_BOT_TOKEN === token) {
  fail("TELEGRAM_DIGEST_BOT_TOKEN совпал с TELEGRAM_BOT_TOKEN (бот заявок). Нужен отдельный демо-бот из @BotFather.");
}
if (mode === "set") {
  if (!secret) fail("не задан TELEGRAM_DIGEST_WEBHOOK_SECRET.");
  if (!SECRET_PATTERN.test(secret)) fail("TELEGRAM_DIGEST_WEBHOOK_SECRET: допустимы только A-Z a-z 0-9 _ - (1–256 символов). Подойдёт `openssl rand -hex 32`.");
}

/** Текст ошибки без токена. */
const scrub = (text) => String(text).split(token).join("***");

async function call(method, body) {
  let res;
  try {
    res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body ?? {}),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (err) {
    fail(`запрос к Telegram не удался: ${scrub(err instanceof Error ? err.message : err)}`);
  }
  const data = await res.json().catch(() => null);
  if (!res.ok || !data?.ok) fail(`Telegram ответил ${res.status}: ${scrub(data?.description ?? "без описания")}`);
  return data.result;
}

if (mode === "info") {
  const info = await call("getWebhookInfo");
  // Печатаем только поля состояния: url, ожидающие апдейты и последняя ошибка доставки.
  console.log(JSON.stringify({ url: info.url, pending_update_count: info.pending_update_count, allowed_updates: info.allowed_updates, last_error_date: info.last_error_date, last_error_message: info.last_error_message }, null, 2));
} else if (mode === "delete") {
  await call("deleteWebhook", { drop_pending_updates: false });
  console.log("Вебхук демо-бота удалён.");
} else {
  await call("setWebhook", { url: WEBHOOK_URL, secret_token: secret, allowed_updates: ALLOWED_UPDATES, drop_pending_updates: true });
  console.log(`Вебхук установлен: ${WEBHOOK_URL} (allowed_updates: ${ALLOWED_UPDATES.join(", ")}).`);
}
