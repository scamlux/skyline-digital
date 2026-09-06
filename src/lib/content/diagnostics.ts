import "server-only";

/**
 * Платформенная диагностика (ПРОМПТ-3 §1.2). Молчаливый отказ публикации
 * недопустим: админка показывает по каждому каналу — настроен он или нет и
 * какой именно переменной окружения не хватает. Крон (§1.5) использует те же
 * предикаты, чтобы решить, публиковать по API или слать ручное напоминание.
 */

export type DiagKind = "publish" | "reminder" | "infra" | "manual";

export interface Diag {
  key: string;
  label: string;
  ok: boolean;
  detail: string;
  missing: string[];
  kind: DiagKind;
}

const present = (name: string): boolean => Boolean(process.env[name]?.trim());

function need(names: string[]): { ok: boolean; missing: string[] } {
  const missing = names.filter((n) => !present(n));
  return { ok: missing.length === 0, missing };
}

/** Публикация в Telegram-канал доступна. */
export function telegramChannelReady(): boolean {
  return present("TELEGRAM_BOT_TOKEN") && present("TELEGRAM_CHANNEL_ID");
}

/** Публикация в Instagram доступна. */
export function instagramReady(): boolean {
  return present("INSTAGRAM_BUSINESS_ID") && present("INSTAGRAM_ACCESS_TOKEN");
}

/** Чат лидов (ручные напоминания) доступен. */
export function leadsChatReady(): boolean {
  return present("TELEGRAM_BOT_TOKEN") && present("TELEGRAM_CHAT_ID");
}

export function contentDiagnostics(): Diag[] {
  const tg = need(["TELEGRAM_BOT_TOKEN", "TELEGRAM_CHANNEL_ID"]);
  const ig = need(["INSTAGRAM_BUSINESS_ID", "INSTAGRAM_ACCESS_TOKEN"]);
  const leads = need(["TELEGRAM_BOT_TOKEN", "TELEGRAM_CHAT_ID"]);
  const cron = need(["CRON_SECRET"]);

  return [
    {
      key: "telegram",
      label: "Telegram-канал",
      ok: tg.ok,
      missing: tg.missing,
      kind: "publish",
      detail: tg.ok ? "Автопубликация каруселью" : "Публикация в Telegram выключена",
    },
    {
      key: "instagram",
      label: "Instagram",
      ok: ig.ok,
      missing: ig.missing,
      kind: "publish",
      detail: ig.ok ? "Автопубликация каруселью/сторис" : "Публикация в Instagram выключена",
    },
    {
      key: "leads_chat",
      label: "Чат лидов (напоминания)",
      ok: leads.ok,
      missing: leads.missing,
      kind: "reminder",
      detail: leads.ok
        ? "Ручные напоминания уходят в чат лидов"
        : "Напоминания о ручной публикации не отправятся",
    },
    {
      key: "cron",
      label: "Cron-секрет",
      ok: cron.ok,
      missing: cron.missing,
      kind: "infra",
      detail: cron.ok
        ? "Эндпоинт крона защищён"
        : "Крон работает без защиты — задайте CRON_SECRET на Vercel",
    },
    {
      key: "facebook",
      label: "Facebook",
      ok: false,
      missing: [],
      kind: "manual",
      detail: "Только вручную (API страницы не подключён)",
    },
    {
      key: "linkedin",
      label: "LinkedIn",
      ok: false,
      missing: [],
      kind: "manual",
      detail: "Только вручную (публикация с личного профиля через API несоразмерна)",
    },
  ];
}
