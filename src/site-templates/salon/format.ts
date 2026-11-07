import { addDays, formatDate } from "../kit/tashkent";
import type { Locale } from "../types";

/** Подстановка {name} в строку интерфейса. */
export const fill = (template: string, vars: Record<string, string | number>) =>
  template.replace(/\{(\w+)\}/g, (_m, k: string) => String(vars[k] ?? ""));

/** «1 ч 15 мин» / «45 мин»: без Intl, одинаково на сервере и в браузере. */
export function formatMinutes(total: number, locale: Locale): string {
  const h = Math.floor(total / 60);
  const m = total % 60;
  const unit = locale === "ru" ? { h: "ч", m: "мин" } : locale === "en" ? { h: "h", m: "min" } : { h: "soat", m: "daq" };
  if (h === 0) return `${m} ${unit.m}`;
  return m === 0 ? `${h} ${unit.h}` : `${h} ${unit.h} ${m} ${unit.m}`;
}

/** «Сегодня, 14:30» / «Завтра, 10:00» / «пт, 7 ноя, 12:00». */
export function whenLabel(date: string, time: string, todayIso: string, locale: Locale): string {
  const words = {
    today: { ru: "Сегодня", en: "Today", uz: "Bugun" },
    tomorrow: { ru: "Завтра", en: "Tomorrow", uz: "Ertaga" },
  };
  if (date === todayIso) return `${words.today[locale]}, ${time}`;
  if (date === addDays(todayIso, 1)) return `${words.tomorrow[locale]}, ${time}`;
  return `${formatDate(date, locale, { weekday: "short", day: "numeric", month: "short" })}, ${time}`;
}

/** Строка заголовка → слова → буквы (для побуквенного появления). Пробелы между словами восстанавливает разметка. */
export const splitHeadline = (text: string): string[][] => text.split(" ").filter(Boolean).map((w) => Array.from(w));
