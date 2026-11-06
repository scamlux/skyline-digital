/**
 * Время и даты по Ташкенту (UTC+5, без перехода на летнее время).
 *
 * Всё считается через сдвинутый Date и методы getUTC*: так результат не зависит от часового
 * пояса машины, на которой открыт сайт (посетитель из другого пояса видит ташкентский график).
 * Чистые функции без React — их же используют сайт, кабинет и тесты.
 */
const TASHKENT_OFFSET_MS = 5 * 3_600_000;
const DAY_MS = 86_400_000;

const pad = (n: number) => String(n).padStart(2, "0");

export interface TashkentNow {
  /** Сегодня в Ташкенте, YYYY-MM-DD. */
  iso: string;
  /** Минуты с начала суток. */
  minutes: number;
  /** День недели: 0 = понедельник … 6 = воскресенье. */
  weekday: number;
}

export function tashkentNow(ts: number = Date.now()): TashkentNow {
  const d = new Date(ts + TASHKENT_OFFSET_MS);
  return {
    iso: `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`,
    minutes: d.getUTCHours() * 60 + d.getUTCMinutes(),
    weekday: (d.getUTCDay() + 6) % 7,
  };
}

/** Метка времени полуночи (UTC) для даты YYYY-MM-DD — только как основа арифметики дат. */
const dayStamp = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
};

export function addDays(iso: string, n: number): string {
  const d = new Date(dayStamp(iso) + n * DAY_MS);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

/** День недели даты: 0 = понедельник … 6 = воскресенье. */
export function weekdayOf(iso: string): number {
  return (new Date(dayStamp(iso)).getUTCDay() + 6) % 7;
}

/** День месяца без ведущего нуля. */
export const dayOfMonth = (iso: string) => Number(iso.slice(8, 10));

/** Разница в днях между датами (b − a). */
export const diffDays = (a: string, b: string) => Math.round((dayStamp(b) - dayStamp(a)) / DAY_MS);

/** «HH:MM» → минуты с начала суток. */
export const toMinutes = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};

/** Минуты с начала суток → «HH:MM». */
export const fromMinutes = (min: number) => `${pad(Math.floor(min / 60))}:${pad(min % 60)}`;

/** Дата YYYY-MM-DD → название дня недели/месяца на языке (через Intl, всегда в UTC — как и сама дата). */
export function formatDate(iso: string, locale: "ru" | "en" | "uz", opts: Intl.DateTimeFormatOptions): string {
  const tag = locale === "uz" ? "uz-Latn-UZ" : locale === "en" ? "en-GB" : "ru-RU";
  return new Date(dayStamp(iso)).toLocaleDateString(tag, { ...opts, timeZone: "UTC" });
}
