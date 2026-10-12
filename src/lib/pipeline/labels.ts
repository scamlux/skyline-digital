import type { OpportunityStatus } from "./types";

/** Подписи для админки и карточек. Без server-only — используется и в клиенте. */

const TYPE_RU: Record<string, string> = {
  website: "Сайт",
  webApp: "Веб-приложение",
  mobileApp: "Мобильное приложение",
  ai: "ИИ-решение",
  automation: "Автоматизация",
  uiux: "UI/UX",
  other: "Другое",
};

export function typeLabelRu(t: string): string {
  return TYPE_RU[t] ?? t;
}

export const STATUS_RU: Record<OpportunityStatus, string> = {
  new: "Новая",
  filtered: "Отсеяна фильтром",
  rejected: "Не прошла оценку",
  review: "На решении",
  applying: "Подаюсь",
  submitted: "Отправлено",
  won: "Выиграли",
  lost: "Не взяли",
  dismissed: "Мимо",
  expired: "Истекла",
};
