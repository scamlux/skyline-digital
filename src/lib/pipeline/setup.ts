import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getTelegramWebhookInfo, isTelegramConfigured, setTelegramWebhook } from "@/lib/telegram";
import { aiAvailable } from "./ai";
import { readPipelineConfig } from "./config";

/**
 * Состояние подключения конвейера — чек-лист на /admin/pipeline. Каждый пункт
 * проверяется по-настоящему (запрос к таблице, getWebhookInfo), а не по
 * наличию переменной, чтобы «зелёный» значил «работает».
 */

export interface SetupCheck {
  key: string;
  label: string;
  ok: boolean;
  hint: string;
}

export function webhookUrl(siteUrl: string): string {
  return `${siteUrl.replace(/\/$/, "")}/api/telegram/webhook`;
}

export async function setupStatus(db: SupabaseClient, siteUrl: string): Promise<SetupCheck[]> {
  const cfg = readPipelineConfig();
  const { error: tableErr } = await db.from("pipeline_runs").select("id").limit(1);
  const hook = isTelegramConfigured() ? await getTelegramWebhookInfo() : null;
  const expected = webhookUrl(siteUrl);

  return [
    {
      key: "migration",
      label: "Таблицы конвейера (миграция 0013)",
      ok: !tableErr,
      hint: "Supabase → SQL Editor → выполнить supabase/migrations/0013_pipeline.sql",
    },
    {
      key: "telegram",
      label: "Бот чата лидов",
      ok: isTelegramConfigured(),
      hint: "TELEGRAM_BOT_TOKEN и TELEGRAM_CHAT_ID в Vercel",
    },
    {
      key: "webhookSecret",
      label: "Секрет вебхука",
      ok: Boolean(process.env.TELEGRAM_WEBHOOK_SECRET),
      hint: "TELEGRAM_WEBHOOK_SECRET в Vercel (случайная строка) и редеплой",
    },
    {
      key: "webhook",
      label: "Вебхук бота подключён",
      ok: hook?.url === expected,
      hint: hook?.url
        ? `Сейчас: ${hook.url}${hook.last_error_message ? ` · ошибка: ${hook.last_error_message}` : ""} — нажми «Подключить вебхук»`
        : "Нажми «Подключить вебхук»",
    },
    {
      key: "ingest",
      label: "Приём писем-оповещений",
      ok: Boolean(process.env.PIPELINE_INGEST_SECRET),
      hint: "PIPELINE_INGEST_SECRET в Vercel (случайная строка) и редеплой; затем скрипт Gmail ниже",
    },
    {
      key: "channels",
      label: "Telegram-каналы с заказами",
      ok: cfg.telegramChannels.length > 0,
      hint: "PIPELINE_TG_CHANNELS в Vercel: публичные каналы через запятую",
    },
    {
      key: "ai",
      label: "ИИ-оценка и тексты",
      ok: aiAvailable(),
      hint: "Без OPENAI_API_KEY работает эвристика и шаблоны",
    },
  ];
}

export async function connectWebhook(siteUrl: string): Promise<{ ok: boolean; message: string }> {
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!secret) return { ok: false, message: "Нет TELEGRAM_WEBHOOK_SECRET в окружении" };
  if (!isTelegramConfigured()) return { ok: false, message: "Бот не настроен (TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID)" };
  if (!/^https:\/\//.test(siteUrl)) return { ok: false, message: `Нужен https-адрес сайта, сейчас: ${siteUrl}` };
  const res = await setTelegramWebhook(webhookUrl(siteUrl), secret);
  return res.ok
    ? { ok: true, message: `Вебхук подключён: ${webhookUrl(siteUrl)}` }
    : { ok: false, message: `Telegram отказал: ${res.error}` };
}
