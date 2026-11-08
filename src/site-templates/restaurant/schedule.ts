import { addDays, fromMinutes, toMinutes, weekdayOf, type TashkentNow } from "../kit/tashkent";

/**
 * Правила брони стола: сетка времени, части дня, зоны, вместимость.
 * Чистые функции без React — их используют окно брони, кабинет и тесты.
 */

export type ZoneId = "hall" | "terrace" | "tapchan";
export const ZONE_IDS: ZoneId[] = ["hall", "terrace", "tapchan"];

export type OccasionId = "birthday" | "business" | "family";
export const OCCASION_IDS: OccasionId[] = ["birthday", "business", "family"];

export type DayPart = "morning" | "day" | "evening";
export const DAY_PARTS: DayPart[] = ["morning", "day", "evening"];

/** Столов в зоне и на сколько гостей зона подходит (по максимуму компании). */
export const ZONES: Record<ZoneId, { tables: number; min: number; max: number }> = {
  hall: { tables: 8, min: 1, max: 12 },
  terrace: { tables: 3, min: 1, max: 8 },
  tapchan: { tables: 2, min: 3, max: 10 },
};

/** Шаг сетки, минут. */
export const SLOT_STEP_MIN = 30;
/** Последняя посадка — за столько минут до закрытия. */
export const LAST_SEATING_BEFORE_CLOSE_MIN = 90;
/** Сегодняшний слот можно взять не раньше чем через столько минут от «сейчас». */
export const LEAD_MIN = 45;
/** Сколько дней вперёд показывает окно брони. */
export const DAYS_AHEAD = 7;

const MORNING_END = 12 * 60;
const DAY_END = 17 * 60;
const PRIME_FROM = 18 * 60 + 30;
const PRIME_TO = 20 * 60 + 30;

export const dayPartOf = (time: string): DayPart => {
  const m = toMinutes(time);
  return m < MORNING_END ? "morning" : m < DAY_END ? "day" : "evening";
};

/** Время посадок: от открытия до (закрытие − 90 минут) с шагом 30. Закрытие раньше открытия — пусто. */
export function slotTimes(open: string, close: string): string[] {
  const from = toMinutes(open);
  const to = toMinutes(close) - LAST_SEATING_BEFORE_CLOSE_MIN;
  const out: string[] = [];
  for (let m = from; m <= to; m += SLOT_STEP_MIN) out.push(fromMinutes(m));
  return out;
}

/** Компания из подписи гостей: «4» → 4, «3–4» → 4, «5–8» → 8, «9+» → 12. Непонятное — 2. */
export function partyMax(guests: string): number {
  const nums = guests.match(/\d+/g)?.map(Number) ?? [];
  if (nums.length === 0) return 2;
  const top = Math.max(...nums);
  return guests.includes("+") ? Math.max(top + 3, 12) : top;
}

export const zoneFits = (zone: ZoneId, party: number): boolean => party >= ZONES[zone].min && party <= ZONES[zone].max;

/** Заявка, которая занимает стол (структурный тип — стор подставляет свой Lead). */
export interface BookingLike {
  when: string;
  zone?: ZoneId;
  status: string;
}

/** Занимают стол только живые заявки; заявка без зоны — зал. */
const holds = (b: BookingLike) => b.status === "new" || b.status === "confirmed";
const zoneOfBooking = (b: BookingLike): ZoneId => b.zone ?? "hall";

/** Детерминированный «шум» 0…99 по строке — демо-загрузка одинакова у всех посетителей. */
function noise(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  return (h >>> 0) % 100;
}

const ZONE_PRESSURE: Record<ZoneId, number> = { hall: 0, terrace: 5, tapchan: 15 };

/**
 * Демо-загрузка: вечерний пик (18:30–20:30) и пт–вс занятее, тапчан занятее зала.
 * Зал вне пика всегда свободен — день никогда не бывает «полностью занят».
 */
export function baseBusy(date: string, time: string, zone: ZoneId): boolean {
  const m = toMinutes(time);
  const prime = m >= PRIME_FROM && m <= PRIME_TO;
  if (zone === "hall" && !prime) return false;
  const weekend = weekdayOf(date) >= 4;
  const pressure = (prime ? 40 : 12) + (weekend ? 20 : 0) + ZONE_PRESSURE[zone];
  return noise(`${date}|${time}|${zone}`) < pressure;
}

export interface Slot {
  time: string;
  status: "free" | "taken";
}

/** Свободен ли слот: демо-загрузка и живые заявки не заняли все столы зоны. */
export function slotIsFree(bookings: BookingLike[], date: string, time: string, zone: ZoneId): boolean {
  if (baseBusy(date, time, zone)) return false;
  const held = bookings.filter((b) => holds(b) && b.when === `${date}T${time}` && zoneOfBooking(b) === zone).length;
  return held < ZONES[zone].tables;
}

/**
 * Сетка дня для выбранной зоны. Прошедшее время сегодня и слоты ближе LEAD_MIN не показываются;
 * не подходящая по размеру зона — пустая сетка. `now` = null (до гидрации) — пусто.
 */
export function slotsForDay(args: {
  open: string;
  close: string;
  date: string;
  zone: ZoneId;
  party: number;
  bookings: BookingLike[];
  now: TashkentNow | null;
}): Slot[] {
  const { open, close, date, zone, party, bookings, now } = args;
  if (!now || date < now.iso || !zoneFits(zone, party)) return [];
  const earliest = date === now.iso ? now.minutes + LEAD_MIN : 0;
  return slotTimes(open, close)
    .filter((time) => toMinutes(time) >= earliest)
    .map((time) => ({ time, status: slotIsFree(bookings, date, time, zone) ? "free" : "taken" }));
}

/** Ближайшие дни со свободным местом (хотя бы один слот в любой части дня). */
export function datesWithRoom(args: Omit<Parameters<typeof slotsForDay>[0], "date">): string[] {
  const { now } = args;
  if (!now) return [];
  return Array.from({ length: DAYS_AHEAD }, (_, i) => addDays(now.iso, i)).filter((date) =>
    slotsForDay({ ...args, date }).some((s) => s.status === "free"),
  );
}

/** Зоны, подходящие компании. */
export const zonesFor = (party: number): ZoneId[] => ZONE_IDS.filter((z) => zoneFits(z, party));
