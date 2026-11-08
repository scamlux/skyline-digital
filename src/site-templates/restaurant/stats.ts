import { addDays, tashkentNow, weekdayOf } from "../kit/tashkent";
import type { DemoEvent, EventType, Lead } from "./store";

/** Цифры кабинета: окна «7 дней» и «прошлые 7 дней», разбивка по дням. Чистые функции — их же гоняют тесты. */
export const DAY_MS = 86_400_000;
export const WEEK_DAYS = 7;
/** Заявок за неделю, с которых кабинет начинает говорить про «пик». */
export const TIP_MIN_LEADS = 3;
/** «Пиковых» дней не больше этого числа — иначе пика нет, нагрузка ровная. */
export const TIP_MAX_DAYS = 3;

export const countEvents = (events: DemoEvent[], type: EventType, from: number, to: number): number =>
  events.filter((e) => {
    if (e.type !== type) return false;
    const ts = Date.parse(e.at);
    return ts >= from && ts < to;
  }).length;

export type StatKey = "leads" | "calls" | "telegram" | "views";
const EVENT_OF: Record<StatKey, EventType> = { leads: "lead", calls: "call", telegram: "telegram", views: "view" };

export function weekStats(events: DemoEvent[], now: number): { k: StatKey; cur: number; delta: number | null }[] {
  const week = [now - WEEK_DAYS * DAY_MS, now] as const;
  const prev = [now - 2 * WEEK_DAYS * DAY_MS, now - WEEK_DAYS * DAY_MS] as const;
  return (Object.keys(EVENT_OF) as StatKey[]).map((k) => {
    const cur = countEvents(events, EVENT_OF[k], week[0], week[1] + 1);
    const before = countEvents(events, EVENT_OF[k], prev[0], prev[1]);
    return { k, cur, delta: before ? Math.round(((cur - before) / before) * 100) : null };
  });
}

/** Заявки по последним семи суткам Ташкента: [{ weekday 0=пн, n }]. */
export function leadsPerDay(events: DemoEvent[], now: number): { iso: string; weekday: number; n: number }[] {
  const today = tashkentNow(now).iso;
  const days = Array.from({ length: WEEK_DAYS }, (_, i) => addDays(today, i - (WEEK_DAYS - 1)));
  const perDay = new Map<string, number>(days.map((d) => [d, 0]));
  for (const e of events) {
    if (e.type !== "lead") continue;
    const iso = tashkentNow(Date.parse(e.at)).iso;
    if (perDay.has(iso)) perDay.set(iso, (perDay.get(iso) ?? 0) + 1);
  }
  return days.map((iso) => ({ iso, weekday: weekdayOf(iso), n: perDay.get(iso) ?? 0 }));
}

/** Дни недели (0 = пн) с наибольшим числом заявок за 7 дней; мало данных или нет пика — пусто. */
export function peakWeekdays(leads: Lead[], now: number): number[] {
  const from = now - WEEK_DAYS * DAY_MS;
  const week = leads.filter((l) => {
    const ts = Date.parse(l.at);
    return ts >= from && ts <= now;
  });
  if (week.length < TIP_MIN_LEADS) return [];
  const perDow = Array.from({ length: 7 }, (_, dow) => week.filter((l) => tashkentNow(Date.parse(l.at)).weekday === dow).length);
  const peak = Math.max(...perDow);
  const top = perDow.flatMap((n, dow) => (n === peak && peak > 0 ? [dow] : []));
  return top.length <= TIP_MAX_DAYS ? top : [];
}
