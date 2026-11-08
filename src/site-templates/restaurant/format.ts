import { addDays, formatDate } from "../kit/tashkent";
import { plural } from "../kit/plural";
import { pick, type Locale } from "../types";
import { guestWords, restaurantUi as ui } from "./ui";

/** Подстановка {name} в строку интерфейса. */
export const fill = (template: string, vars: Record<string, string | number>): string =>
  template.replace(/\{(\w+)\}/g, (_m, k: string) => String(vars[k] ?? ""));

/** «4 гостя», «3–4 гостя», «9+ гостей»: слово склоняется по большему числу компании. */
export function guestsText(label: string, max: number, locale: Locale): string {
  return `${label} ${plural(locale, max, guestWords[locale])}`;
}

/** «Сегодня, 19:30» / «Завтра, 19:30» / «сб, 14 нояб., 19:30» — по дате относительно сегодня (Ташкент). */
export function whenLabel(date: string, time: string, todayIso: string, locale: Locale): string {
  const tail = time ? `, ${time}` : "";
  if (date === todayIso) return `${pick(ui.sheet.today, locale)}${tail}`;
  if (date === addDays(todayIso, 1)) return `${pick(ui.sheet.tomorrow, locale)}${tail}`;
  return `${formatDate(date, locale, { weekday: "short", day: "numeric", month: "short" })}${tail}`;
}

/** Подпись даты для кнопки: «Сегодня», «Завтра» или «сб 14». */
export function dateChipLabel(date: string, todayIso: string, locale: Locale): { top: string; bottom: string } {
  const bottom = formatDate(date, locale, { day: "numeric", month: "short" });
  if (date === todayIso) return { top: pick(ui.sheet.today, locale), bottom };
  if (date === addDays(todayIso, 1)) return { top: pick(ui.sheet.tomorrow, locale), bottom };
  return { top: formatDate(date, locale, { weekday: "short" }), bottom };
}
