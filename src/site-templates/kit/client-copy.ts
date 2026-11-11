import type { L } from "../types";

/**
 * Тексты кабинета владельца в режиме "client" (экспортированный сайт, ADR 0009). Общие для всех
 * шаблонов: кабинет остаётся «личным блокнотом» в браузере, и об этом сказано прямо.
 */
export const adminClientCopy = {
  badge: { ru: "Кабинет владельца", en: "Owner dashboard", uz: "Egasining kabineti" },
  text: {
    ru: "Данные хранятся только в этом браузере, на сервер ничего не уходит. Заявки гостей приходят вам в Telegram, а не сюда: здесь видны только те, что оставили с этого же устройства.",
    en: "Data is stored only in this browser; nothing goes to a server. Guest requests reach you on Telegram, not here: only those made from this very device show up.",
    uz: "Maʼlumotlar faqat shu brauzerda saqlanadi, serverga hech narsa yuborilmaydi. Mehmonlar soʻrovlari sizga Telegramga keladi, bu yerga emas: faqat shu qurilmadan qoldirilganlari koʻrinadi.",
  },
  reset: { ru: "Очистить данные кабинета", en: "Clear dashboard data", uz: "Kabinet maʼlumotlarini tozalash" },
} satisfies Record<string, L>;
