import { fromMinutes, toMinutes, type TashkentNow, weekdayOf, addDays } from "../kit/tashkent";

/**
 * Минимум данных клиники, нужный расчётам. Клиентские острова получают только его (а не весь
 * ClinicData с текстами на трёх языках), поэтому типы здесь структурные.
 */
export interface ServiceCore {
  id: string;
  min: number;
  max: number;
  calc: boolean;
  maxQty: number;
  visitsFirst: number;
  visitsEach: number;
}

export interface DoctorCore {
  id: string;
  serviceIds: string[];
  days: number[];
}

export interface ScheduleData {
  hours: { open: string; close: string; closedDays: number[] };
  slotMinutes: number;
  services: ServiceCore[];
  doctors: DoctorCore[];
}

/** Срез ClinicData для расчётов: без текстов, только числа и идентификаторы. */
export function toScheduleData(data: ScheduleData): ScheduleData {
  return {
    hours: data.hours,
    slotMinutes: data.slotMinutes,
    services: data.services.map((s) => ({ id: s.id, min: s.min, max: s.max, calc: s.calc, maxQty: s.maxQty, visitsFirst: s.visitsFirst, visitsEach: s.visitsEach })),
    doctors: data.doctors.map((d) => ({ id: d.id, serviceIds: d.serviceIds, days: d.days })),
  };
}

/**
 * Чистая логика записи и расчёта: слоты, занятость, цена плана. Без React и без хранилища —
 * правки владельца и записи приходят аргументами. Её же вызывают форма записи, карточка
 * «ближайшее окно», кабинет и тесты, поэтому «выходной врача убирает слоты» проверяется
 * на том же коде, что работает на сайте.
 */

/** Правки владельца, которые влияют на сайт. */
export interface ClinicOverrides {
  services: Record<string, { min?: number; max?: number; hidden?: boolean }>;
  /** Приёмные дни врача (0 = пн … 5 = сб), если владелец их менял. */
  schedule: Record<string, number[]>;
}

/** То, что нужно слотам от записи: чья, когда, жива ли. */
export interface BusySlot {
  doctorId: string;
  date: string;
  time: string;
  status: string;
}

export const NO_OVERRIDES: ClinicOverrides = { services: {}, schedule: {} };

/** Заявка занимает слот врача, пока не отменена. */
const blocks = (b: BusySlot) => b.status !== "cancelled";

/** Минимальный запас до ближайшего слота «сегодня», минут: на дорогу и подготовку кабинета. */
export const LEAD_MINUTES = 30;

/** Доля слотов, которые «уже заняты другими пациентами» (детерминированно, по дню/врачу/времени). */
const TAKEN_SHARE = 34;

/** Время начала приёма за день: от открытия до закрытия минус шаг (закрытие в 19:00 — последний слот 18:30). */
export function slotTimes(data: ScheduleData): string[] {
  const out: string[] = [];
  const end = toMinutes(data.hours.close);
  for (let m = toMinutes(data.hours.open); m + data.slotMinutes <= end; m += data.slotMinutes) out.push(fromMinutes(m));
  return out;
}

export type EffectiveService<S extends ServiceCore = ServiceCore> = S & { hidden: boolean };

/** Услуга с учётом правок владельца: цена и скрытие. Нижняя граница не выше верхней. */
export function effectiveService<S extends ServiceCore>(svc: S, ov: ClinicOverrides): EffectiveService<S> {
  const o = ov.services[svc.id] ?? {};
  const min = Math.max(0, o.min ?? svc.min);
  const max = Math.max(min, o.max ?? svc.max);
  return { ...svc, min, max, hidden: o.hidden === true };
}

export const visibleServices = <S extends ServiceCore>(data: { services: S[] }, ov: ClinicOverrides): EffectiveService<S>[] =>
  data.services.map((s) => effectiveService(s, ov)).filter((s) => !s.hidden);

/** Приёмные дни врача с учётом правок; закрытые дни клиники отбрасываются всегда. */
export function doctorDays(data: ScheduleData, doc: DoctorCore, ov: ClinicOverrides): number[] {
  return (ov.schedule[doc.id] ?? doc.days).filter((d) => !data.hours.closedDays.includes(d));
}

export const doctorWorks = (data: ScheduleData, doc: DoctorCore, ov: ClinicOverrides, date: string): boolean =>
  doctorDays(data, doc, ov).includes(weekdayOf(date));

/** Врачи, которые ведут услугу. */
export const doctorsFor = <D extends DoctorCore>(data: { doctors: D[] }, serviceId: string): D[] =>
  data.doctors.filter((d) => d.serviceIds.includes(serviceId));

/** FNV-1a: стабильная «случайность» для слотов (одна и та же у всех посетителей и при перезагрузке). */
function hash(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

const takenByOthers = (date: string, doctorId: string, time: string) => hash(`${date}|${doctorId}|${time}`) % 100 < TAKEN_SHARE;

export type SlotStatus = "free" | "taken" | "past";

export interface Slot {
  time: string;
  status: SlotStatus;
  /** Врач, к которому уйдёт запись (для «любой врач» — первый свободный). */
  doctorId: string | null;
}

export interface SlotQuery {
  data: ScheduleData;
  ov: ClinicOverrides;
  bookings: BusySlot[];
  date: string;
  serviceId: string;
  /** Конкретный врач или "any". */
  doctorId: string | "any";
  now: TashkentNow;
}

/** Сетка слотов на день. Пустая, если клиника закрыта или никто из подходящих врачей не принимает. */
export function slotsForDay(q: SlotQuery): Slot[] {
  const { data, ov, bookings, date, serviceId, doctorId, now } = q;
  if (data.hours.closedDays.includes(weekdayOf(date))) return [];
  const pool = doctorsFor(data, serviceId).filter((d) => (doctorId === "any" || d.id === doctorId) && doctorWorks(data, d, ov, date));
  if (pool.length === 0) return [];
  const busy = new Set(bookings.filter((b) => b.date === date && blocks(b)).map((b) => `${b.doctorId}|${b.time}`));
  return slotTimes(data).map((time) => {
    if (date < now.iso || (date === now.iso && toMinutes(time) < now.minutes + LEAD_MINUTES)) {
      return { time, status: "past", doctorId: null };
    }
    const free = pool.find((d) => !busy.has(`${d.id}|${time}`) && !takenByOthers(date, d.id, time));
    return free ? { time, status: "free", doctorId: free.id } : { time, status: "taken", doctorId: null };
  });
}

export interface FreeSlot {
  date: string;
  time: string;
  doctorId: string;
}

/** Ближайшее свободное окно у любого врача в ближайшие `days` дней (для карточки в hero). */
export function nextFreeSlot(data: ScheduleData, ov: ClinicOverrides, bookings: BusySlot[], now: TashkentNow, days = 8): FreeSlot | null {
  const services = visibleServices(data, ov);
  for (let i = 0; i < days; i++) {
    const date = addDays(now.iso, i);
    for (const svc of services) {
      const slot = slotsForDay({ data, ov, bookings, date, serviceId: svc.id, doctorId: "any", now }).find((s) => s.status === "free");
      if (slot?.doctorId) return { date, time: slot.time, doctorId: slot.doctorId };
    }
  }
  return null;
}

/**
 * Ближайшее свободное окно по конкретной услуге (и врачу, если задан): для плиток «Что беспокоит?»
 * и карточек врачей. Та же сетка, что в записи, поэтому время всегда совпадает со свободным слотом.
 */
export function nextFreeSlotFor(
  data: ScheduleData,
  ov: ClinicOverrides,
  bookings: BusySlot[],
  now: TashkentNow,
  q: { serviceId?: string; doctorId?: string | "any" },
  days = 8,
): FreeSlot | null {
  const ids = q.serviceId ? [q.serviceId] : visibleServices(data, ov).map((s) => s.id);
  for (let i = 0; i < days; i++) {
    const date = addDays(now.iso, i);
    for (const serviceId of ids) {
      const slot = slotsForDay({ data, ov, bookings, date, serviceId, doctorId: q.doctorId ?? "any", now }).find((s) => s.status === "free");
      if (slot?.doctorId) return { date, time: slot.time, doctorId: slot.doctorId };
    }
  }
  return null;
}

/** Часть дня для фильтра времени: утро до 12:00, день до 16:00, вечер дальше. */
export type DayPart = "morning" | "day" | "evening";
export const DAY_PARTS: DayPart[] = ["morning", "day", "evening"];
const MORNING_END = 12 * 60;
const DAY_END = 16 * 60;

export function dayPartOf(time: string): DayPart {
  const m = toMinutes(time);
  return m < MORNING_END ? "morning" : m < DAY_END ? "day" : "evening";
}

export interface RangeTotals {
  min: number;
  max: number;
  /** Визитов от и до (округлено вверх). */
  visitsMin: number;
  visitsMax: number;
}

/**
 * Вилка по одному из вариантов лечения («болит зуб»: пломба или каналы): от самого дешёвого
 * до самого дорогого, цены — с учётом правок владельца. Скрытые услуги не участвуют; если
 * скрыто всё — null.
 */
export function optionsRange(data: ScheduleData, ov: ClinicOverrides, serviceIds: string[]): RangeTotals | null {
  const found = serviceIds.flatMap((id) => {
    const base = data.services.find((s) => s.id === id);
    if (!base) return [];
    const svc = effectiveService(base, ov);
    return svc.hidden ? [] : [svc];
  });
  if (found.length === 0) return null;
  return {
    min: Math.min(...found.map((s) => s.min)),
    max: Math.max(...found.map((s) => s.max)),
    visitsMin: Math.ceil(Math.min(...found.map((s) => s.visitsFirst))),
    visitsMax: Math.ceil(Math.max(...found.map((s) => s.visitsFirst))),
  };
}

/** Выбор калькулятора: услуга и количество единиц. */
export interface PlanItem {
  id: string;
  qty: number;
}

export interface PlanTotals {
  min: number;
  max: number;
  /** Ориентировочное число визитов (округлено вверх). */
  visits: number;
  /** Позиции с учётом скрытых услуг. */
  items: PlanItem[];
}

/** Сумма вилок и визитов по плану; скрытые и нерасчётные услуги отбрасываются. */
export function calcPlan(data: ScheduleData, ov: ClinicOverrides, items: PlanItem[]): PlanTotals {
  let min = 0;
  let max = 0;
  let visits = 0;
  const kept: PlanItem[] = [];
  for (const it of items) {
    const base = data.services.find((s) => s.id === it.id);
    if (!base || it.qty <= 0) continue;
    const svc = effectiveService(base, ov);
    if (svc.hidden || !svc.calc) continue;
    const qty = Math.min(it.qty, svc.maxQty);
    min += svc.min * qty;
    max += svc.max * qty;
    visits += svc.visitsFirst + svc.visitsEach * (qty - 1);
    kept.push({ id: it.id, qty });
  }
  return { min, max, visits: Math.ceil(visits), items: kept };
}
