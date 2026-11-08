import { addDays, fromMinutes, toMinutes, weekdayOf, type TashkentNow } from "../kit/tashkent";

/**
 * Чистая логика записи и подбора образа: слоты с учётом длительности, занятость мастеров,
 * сумма и время набора услуг. Без React и без хранилища — правки владельца и записи
 * приходят аргументами, поэтому сайт, кабинет и тесты зовут один и тот же код.
 * Типы структурные: клиентские острова получают только числа и идентификаторы.
 */
export interface ServiceCore {
  id: string;
  minutes: number;
  price: number;
}

export interface MasterCore {
  id: string;
  serviceIds: string[];
  days: number[];
}

export interface LookCore {
  id: string;
  serviceIds: string[];
  masterId: string;
}

/** Пакет: набор услуг со скидкой, которая применяется сама, когда в записи есть все его услуги. */
export interface PackageCore {
  id: string;
  serviceIds: string[];
  /** Скидка по умолчанию, %. */
  pct: number;
}

export interface ScheduleData {
  hours: { open: string; close: string };
  slotMinutes: number;
  services: ServiceCore[];
  masters: MasterCore[];
  looks: LookCore[];
  packages: PackageCore[];
  /** Результаты подбора образа: ключ «<ответ1>.<ответ2>». */
  quizResults: Record<string, { lookId: string; serviceIds: string[] }>;
  /** Наборы услуг для демо-записей кабинета. */
  seedBaskets: string[][];
}

/** Срез SalonData для расчётов: без текстов. */
export function toScheduleData(data: {
  hours: ScheduleData["hours"];
  slotMinutes: number;
  services: ServiceCore[];
  masters: MasterCore[];
  looks: LookCore[];
  packages: PackageCore[];
  quiz: { results: ScheduleData["quizResults"] };
  seedBaskets: string[][];
}): ScheduleData {
  return {
    hours: data.hours,
    slotMinutes: data.slotMinutes,
    services: data.services.map((s) => ({ id: s.id, minutes: s.minutes, price: s.price })),
    masters: data.masters.map((m) => ({ id: m.id, serviceIds: m.serviceIds, days: m.days })),
    looks: data.looks.map((l) => ({ id: l.id, serviceIds: l.serviceIds, masterId: l.masterId })),
    packages: data.packages.map((p) => ({ id: p.id, serviceIds: p.serviceIds, pct: p.pct })),
    quizResults: data.quiz.results,
    seedBaskets: data.seedBaskets,
  };
}

export interface ServiceOverride {
  price?: number;
  minutes?: number;
  hidden?: boolean;
}

export interface PackageOverride {
  /** Скидка, % (0–50). */
  pct?: number;
  hidden?: boolean;
}

/** Правки владельца: услуги (цена, длительность, скрытие), пакеты и рабочие дни мастеров. */
export interface SalonOverrides {
  services: Record<string, ServiceOverride>;
  schedule: Record<string, number[]>;
  packages?: Record<string, PackageOverride>;
}

export const NO_OVERRIDES: SalonOverrides = { services: {}, schedule: {} };

/** Запись или другое занятое окно мастера. Отменённые время не занимают. */
export interface BusySlot {
  masterId: string;
  date: string;
  time: string;
  /** Длительность, минут. */
  minutes: number;
  status: string;
}

const blocks = (b: BusySlot) => b.status !== "cancelled";

/** Запас до ближайшего слота «сегодня», минут: дорога и подготовка кресла. */
export const LEAD_MINUTES = 30;
/** Длительность «обычного визита» для карточки «ближайшее окно», когда услуги не выбраны. */
export const DEFAULT_VISIT_MINUTES = 45;
/** Сколько дней вперёд ищем ближайшее окно. */
export const SEARCH_DAYS = 14;

/** Время начала записи за день, шаг сетки (длительность услуги проверяется отдельно). */
export function slotTimes(data: Pick<ScheduleData, "hours" | "slotMinutes">): string[] {
  const out: string[] = [];
  const end = toMinutes(data.hours.close);
  for (let m = toMinutes(data.hours.open); m + data.slotMinutes <= end; m += data.slotMinutes) out.push(fromMinutes(m));
  return out;
}

export type EffectiveService<S extends ServiceCore = ServiceCore> = S & { hidden: boolean };

/** Услуга с учётом правок владельца: цена, длительность и скрытие. */
export function effectiveService<S extends ServiceCore>(svc: S, ov: SalonOverrides): EffectiveService<S> {
  const o = ov.services[svc.id] ?? {};
  return {
    ...svc,
    price: Math.max(0, o.price ?? svc.price),
    minutes: Math.max(5, o.minutes ?? svc.minutes),
    hidden: o.hidden === true,
  };
}

export const visibleServices = <S extends ServiceCore>(data: { services: S[] }, ov: SalonOverrides): EffectiveService<S>[] =>
  data.services.map((s) => effectiveService(s, ov)).filter((s) => !s.hidden);

/** Рабочие дни мастера с учётом правок владельца. */
export const masterDays = (m: MasterCore, ov: SalonOverrides): number[] => ov.schedule[m.id] ?? m.days;
export const masterWorks = (m: MasterCore, ov: SalonOverrides, date: string): boolean => masterDays(m, ov).includes(weekdayOf(date));

/** Мастера, которые ведут ВСЕ перечисленные услуги (пустой список — любые мастера). */
export const mastersFor = (data: ScheduleData, serviceIds: string[]): MasterCore[] =>
  data.masters.filter((m) => serviceIds.every((id) => m.serviceIds.includes(id)));

export interface Basket {
  /** Выбранные услуги без скрытых и несуществующих. */
  ids: string[];
  minutes: number;
  /** Итог к оплате, с учётом пакета. */
  price: number;
  /** Сумма услуг без скидки. */
  full: number;
  /** Сколько сэкономлено по пакету, сум. */
  saved: number;
  /** Применённый пакет (самый выгодный из полностью собранных). */
  packageId: string | null;
}

/** Шаг округления скидки: цены кратны тысяче, чтобы суммы читались. */
const DISCOUNT_STEP = 1000;
export const MAX_DISCOUNT_PCT = 50;

/** Эффективная скидка пакета с учётом правок; скрытый пакет не действует. */
export function packagePct(pkg: PackageCore, ov: SalonOverrides): number {
  const o = ov.packages?.[pkg.id];
  if (o?.hidden) return 0;
  return Math.min(MAX_DISCOUNT_PCT, Math.max(0, Math.round(o?.pct ?? pkg.pct)));
}

const discountOf = (sum: number, pct: number) => Math.round((sum * pct) / 100 / DISCOUNT_STEP) * DISCOUNT_STEP;

/** Сумма, время и скидка набора услуг с учётом правок владельца. Единственное место, где считается цена. */
export function basketOf(data: ScheduleData, ov: SalonOverrides, ids: string[]): Basket {
  let minutes = 0;
  let full = 0;
  const kept: string[] = [];
  const priceOf = new Map<string, number>();
  for (const id of ids) {
    const base = data.services.find((s) => s.id === id);
    if (!base || kept.includes(id)) continue;
    const svc = effectiveService(base, ov);
    if (svc.hidden) continue;
    kept.push(id);
    priceOf.set(id, svc.price);
    minutes += svc.minutes;
    full += svc.price;
  }
  let saved = 0;
  let packageId: string | null = null;
  for (const pkg of data.packages) {
    const pct = packagePct(pkg, ov);
    if (pct <= 0 || !pkg.serviceIds.every((id) => kept.includes(id))) continue;
    const cut = discountOf(pkg.serviceIds.reduce((sum, id) => sum + (priceOf.get(id) ?? 0), 0), pct);
    if (cut > saved) {
      saved = cut;
      packageId = pkg.id;
    }
  }
  return { ids: kept, minutes, price: full - saved, full, saved, packageId };
}

/** Цена и время пакета целиком (для карточки пакета). Скрытый или пустой пакет — null. */
export function packageBasket(data: ScheduleData, ov: SalonOverrides, pkg: PackageCore): Basket | null {
  if (ov.packages?.[pkg.id]?.hidden) return null;
  const b = basketOf(data, ov, pkg.serviceIds);
  return b.ids.length === pkg.serviceIds.length ? b : null;
}

/** Часть дня для фильтра сетки: утро до 12:00, день до 17:00, дальше вечер. */
export type DayPart = "morning" | "day" | "evening";
export const DAY_PARTS: DayPart[] = ["morning", "day", "evening"];
const NOON = 12 * 60;
const EVENING_FROM = 17 * 60;
export function partOfDay(time: string): DayPart {
  const m = toMinutes(time);
  return m < NOON ? "morning" : m < EVENING_FROM ? "day" : "evening";
}

/**
 * Можно ли добавить услугу к выбранным: найдётся ли мастер (если мастер уже выбран, то именно он),
 * который ведёт всё вместе. Нужно, чтобы выбор не упирался в «нет мастера».
 */
export function canCombine(data: ScheduleData, ids: string[], candidate: string, masterId?: string): boolean {
  return mastersFor(data, [...ids, candidate]).some((m) => !masterId || masterId === "any" || m.id === masterId);
}

/** Детерминированный хэш (FNV-1a): «чужие» записи одинаковы у всех посетителей. */
function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Доля начал «чужих» записей на шаг сетки, %. */
const OTHERS_START_SHARE = 20;

/**
 * Окна, которые «уже занимают другие гости»: у каждого мастера в каждый день свой набор
 * записей по 30–90 минут (детерминированно по дате и мастеру).
 */
export function othersBusy(data: Pick<ScheduleData, "hours" | "slotMinutes">, date: string, masterId: string): [number, number][] {
  const out: [number, number][] = [];
  const end = toMinutes(data.hours.close);
  const step = data.slotMinutes;
  let m = toMinutes(data.hours.open);
  while (m < end) {
    const h = hash(`${date}|${masterId}|${m}`);
    if (h % 100 < OTHERS_START_SHARE) {
      const len = step * (1 + ((h >>> 8) % 3));
      out.push([m, m + len]);
      m += len;
    } else m += step;
  }
  return out;
}

const overlaps = (a0: number, a1: number, b0: number, b1: number) => a0 < b1 && b0 < a1;

export type SlotStatus = "free" | "taken" | "past";

export interface Slot {
  time: string;
  status: SlotStatus;
  /** Мастер, к которому уйдёт запись (для «любой мастер» первый свободный). */
  masterId: string | null;
}

export interface SlotQuery {
  data: ScheduleData;
  ov: SalonOverrides;
  bookings: BusySlot[];
  date: string;
  /** Набор услуг; пустой — «обычный визит» DEFAULT_VISIT_MINUTES. */
  serviceIds: string[];
  /** Конкретный мастер или "any". */
  masterId: string | "any";
  now: TashkentNow;
}

/** Сетка начал записи на день: только те, где набор услуг помещается до закрытия. */
export function slotsForDay(q: SlotQuery): Slot[] {
  const { data, ov, bookings, date, serviceIds, masterId, now } = q;
  const basket = basketOf(data, ov, serviceIds);
  if (serviceIds.length > 0 && basket.ids.length === 0) return [];
  const minutes = basket.ids.length > 0 ? basket.minutes : DEFAULT_VISIT_MINUTES;
  const close = toMinutes(data.hours.close);
  const pool = mastersFor(data, basket.ids).filter((m) => (masterId === "any" || m.id === masterId) && masterWorks(m, ov, date));
  if (pool.length === 0) return [];
  const live = bookings.filter((b) => b.date === date && blocks(b));
  const others = new Map(pool.map((m) => [m.id, othersBusy(data, date, m.id)]));

  const out: Slot[] = [];
  for (const time of slotTimes(data)) {
    const start = toMinutes(time);
    const stop = start + minutes;
    if (stop > close) continue;
    if (date < now.iso || (date === now.iso && start < now.minutes + LEAD_MINUTES)) {
      out.push({ time, status: "past", masterId: null });
      continue;
    }
    const free = pool.find(
      (m) =>
        !others.get(m.id)!.some(([a, b]) => overlaps(start, stop, a, b)) &&
        !live.some((b) => b.masterId === m.id && overlaps(start, stop, toMinutes(b.time), toMinutes(b.time) + b.minutes)),
    );
    out.push({ time, status: free ? "free" : "taken", masterId: free?.id ?? null });
  }
  return out;
}

export interface NextSlot {
  date: string;
  time: string;
  masterId: string;
}

/** Ближайшее свободное окно за SEARCH_DAYS дней (для карточки мастера и hero). */
export function nextFreeSlot(
  data: ScheduleData,
  ov: SalonOverrides,
  bookings: BusySlot[],
  now: TashkentNow,
  opts: { masterId?: string; serviceIds?: string[] } = {},
): NextSlot | null {
  for (let i = 0; i < SEARCH_DAYS; i++) {
    const date = addDays(now.iso, i);
    const slot = slotsForDay({ data, ov, bookings, date, serviceIds: opts.serviceIds ?? [], masterId: opts.masterId ?? "any", now }).find((s) => s.status === "free");
    if (slot?.masterId) return { date, time: slot.time, masterId: slot.masterId };
  }
  return null;
}
