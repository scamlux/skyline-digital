import { addDays, formatDate } from "../kit/tashkent";
import type { L, Locale } from "../types";
import { pick } from "../types";

/** Подстановка {name} в строку интерфейса. */
export const fill = (template: string, vars: Record<string, string | number>): string => template.replace(/\{(\w+)\}/g, (_m, k: string) => String(vars[k] ?? ""));

const DAY_WORDS: Record<"today" | "tomorrow", L> = {
  today: { ru: "Сегодня", en: "Today", uz: "Bugun" },
  tomorrow: { ru: "Завтра", en: "Tomorrow", uz: "Ertaga" },
};

/** «Сегодня, 14:30» / «Завтра, 08:15» / «пт, 7 ноя, 12:00» — по дате получения относительно сегодня (Ташкент). */
export function pickupLabel(date: string, time: string, todayIso: string, locale: Locale): string {
  if (date === todayIso) return `${pick(DAY_WORDS.today, locale)}, ${time}`;
  if (date === addDays(todayIso, 1)) return `${pick(DAY_WORDS.tomorrow, locale)}, ${time}`;
  return `${formatDate(date, locale, { weekday: "short", day: "numeric", month: "short" })}, ${time}`;
}

import { OPTIONS, itemById } from "./data";
import type { Selection } from "./pricing";

/** Выбранные опции словами: «M, овсяное, ваниль». Размер показываем всегда, остальное — если не по умолчанию. */
export function optionWords(itemId: string, sel: Selection, locale: Locale): string {
  const item = itemById(itemId);
  if (!item) return "";
  const out: string[] = [];
  for (const kind of item.options) {
    const group = OPTIONS[kind];
    const id = sel[kind] ?? group.def;
    if (kind !== "size" && id === group.def) continue;
    const choice = group.choices.find((c) => c.id === id);
    if (choice) out.push(kind === "size" ? pick(choice.label, locale) : pick(choice.label, locale).toLowerCase());
  }
  return out.join(", ");
}
