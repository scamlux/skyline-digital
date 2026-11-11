import type { L, Locale } from "../types";
import { digestDeepLink, type DigestPayload } from "./digest-payload";

/**
 * Кнопка «Получить в Telegram» под превью сводки в кабинете. Ведёт на бота с цифрами в `?start=`;
 * сам бот — внешний сервис студии (в экспортированном сайте без имени бота кнопки нет, см. `bot` в Admin).
 * Стили — класс `.adm-btn` самого шаблона плюс `.adm-tg` из его admin.css.
 */

export const digestCopy = {
  button: { ru: "Получить в Telegram", en: "Get it on Telegram", uz: "Telegramda olish" },
  caption: {
    ru: "Бот пришлёт вам в Telegram цифры этой недели из демо — в таком виде сводка приходит владельцу.",
    en: "The bot will send you this week’s demo numbers on Telegram — the way the owner gets the digest.",
    uz: "Bot Telegramga shu haftaning demo raqamlarini yuboradi — xulosa egasiga xuddi shunday keladi.",
  },
} satisfies Record<string, L>;

export function DigestTelegramButton({ bot, payload, locale }: { bot: string; payload: DigestPayload; locale: Locale }) {
  return (
    <a className="adm-btn adm-tg" href={digestDeepLink(bot, payload)} target="_blank" rel="noopener noreferrer">
      <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false">
        <path fill="currentColor" d="M21.9 4.3 2.8 11.6c-1 .4-1 1.2-.2 1.4l4.9 1.5 1.9 5.7c.2.5.5.7.9.7s.6-.2.8-.4l2.3-2.3 4.7 3.5c.9.5 1.5.2 1.7-.8L23.1 5.5c.3-1.3-.5-1.8-1.2-1.2ZM9 14.2l9.4-5.9c.4-.3.8-.1.5.2l-7.8 7.1-.3 3.2L9 14.2Z" />
      </svg>
      {digestCopy.button[locale]}
    </a>
  );
}
