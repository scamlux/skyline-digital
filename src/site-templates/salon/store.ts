"use client";

import { createPersistedStore } from "../kit/persisted-store";
import type { L, StyleId } from "../types";
import { toMinutes } from "../kit/tashkent";
import { MAX_DISCOUNT_PCT, type BusySlot, type PackageOverride, type ServiceOverride } from "./schedule";

/**
 * Демо-хранилище салона: записи с сайта, события, правки владельца (цены, длительность, скрытые
 * услуги, рабочие дни мастеров, акция). Живёт в localStorage браузера, который смотрит демо:
 * сайт и кабинет работают с одним объектом, запись с сайта появляется в кабинете, выходной
 * мастера убирает его окна на сайте. Ничего не уходит на сервер. В боевом сайте тот же
 * интерфейс реализуется поверх базы (ADR 0009).
 */
export const storeKey = (style: StyleId): string => `skyline-demo-salon-${style}-v2`;
/** Какой бизнес демо смотрели последним: кабинет открывается сразу на нём. */
export const LAST_STYLE_KEY = "skyline-demo-salon-last";

export type BookingStatus = "new" | "confirmed" | "arrived" | "noshow" | "cancelled";

export interface Booking extends BusySlot {
  id: string;
  /** ISO-время создания записи. */
  at: string;
  name: string;
  phone: string;
  serviceIds: string[];
  /** Гость выбрал «любой мастер» — кабинет подпишет это рядом с назначенным мастером. */
  anyMaster: boolean;
  /** Сумма набора услуг на момент записи, сум. */
  total: number;
  /** Образ из лукбука, с которого началась запись. */
  lookId?: string;
  /** Угощение, которое выбрал гость (кофе, виски, чай). */
  perk?: string;
  /** Пакет со скидкой, если он сработал (для кабинета). */
  packageId?: string;
  status: BookingStatus;
  source: "site" | "seed";
}

export type EventType = "view" | "call" | "telegram" | "route" | "quiz" | "look" | "booking";

export interface DemoEvent {
  at: string;
  type: EventType;
}

export interface SalonState {
  services: Record<string, ServiceOverride>;
  schedule: Record<string, number[]>;
  packages: Record<string, PackageOverride>;
  promo?: { on: boolean; text?: Partial<L> };
  bookings: Booking[];
  events: DemoEvent[];
  /** Когда наполнили демо-данными — окно «за 7 дней» считается относительно текущего момента. */
  seededAt?: string;
}

const EMPTY: SalonState = { services: {}, schedule: {}, packages: {}, bookings: [], events: [] };

export type NewBooking = Omit<Booking, "id" | "at" | "status" | "source">;
export type SeedBooking = Omit<Booking, "id" | "source">;

const DAY_MS = 86_400_000;
const MAX_EVENTS = 800;
const MIN_MINUTES = 5;
const MAX_MINUTES = 480;
let bookingCounter = 0;

/** Окно мастера уже занято живой записью (пересечение интервалов). */
const isBusy = (bookings: Booking[], b: Pick<BusySlot, "masterId" | "date" | "time" | "minutes">) => {
  const a0 = toMinutes(b.time);
  const a1 = a0 + b.minutes;
  return bookings.some((x) => {
    if (x.status === "cancelled" || x.masterId !== b.masterId || x.date !== b.date) return false;
    const x0 = toMinutes(x.time);
    return a0 < x0 + x.minutes && x0 < a1;
  });
};

function createDemo(store: ReturnType<typeof createPersistedStore<SalonState>>) {
  return {
    get: store.read,

    /** Чистый лист: пусто, но демо считается заполненным — кабинет не наполнится сам. */
    reset() {
      store.write({ ...EMPTY, seededAt: new Date().toISOString() });
    },

    track(type: EventType) {
      const s = store.read();
      store.write({ ...s, events: [...s.events.slice(-(MAX_EVENTS - 1)), { at: new Date().toISOString(), type }] });
    },

    /**
     * Запись с сайта. Если окно мастера успел занять другой посетитель (две вкладки) — null,
     * форма покажет, что время занято. id уникален и без Date.now()-коллизий.
     */
    addBooking(input: NewBooking): Booking | null {
      const s = store.read();
      if (isBusy(s.bookings, input)) return null;
      const at = new Date().toISOString();
      bookingCounter += 1;
      const item: Booking = { ...input, id: `b${Date.now().toString(36)}${bookingCounter.toString(36)}`, at, status: "new", source: "site" };
      store.write({ ...s, bookings: [item, ...s.bookings], events: [...s.events.slice(-(MAX_EVENTS - 1)), { at, type: "booking" }] });
      return item;
    },

    setStatus(id: string, status: BookingStatus) {
      const s = store.read();
      store.write({ ...s, bookings: s.bookings.map((b) => (b.id === id ? { ...b, status } : b)) });
    },

    /** Правка услуги: цена ≥ 0, длительность 5–480 минут, скрытие. Целые числа. */
    setService(id: string, patch: ServiceOverride) {
      const s = store.read();
      const next: ServiceOverride = { ...s.services[id], ...patch };
      if (patch.price !== undefined) next.price = Math.max(0, Math.round(patch.price));
      if (patch.minutes !== undefined) next.minutes = Math.min(MAX_MINUTES, Math.max(MIN_MINUTES, Math.round(patch.minutes)));
      store.write({ ...s, services: { ...s.services, [id]: next } });
    },

    /** Правка пакета: скидка 0–50 % и скрытие. */
    setPackage(id: string, patch: PackageOverride) {
      const s = store.read();
      const next: PackageOverride = { ...s.packages[id], ...patch };
      if (patch.pct !== undefined) next.pct = Math.min(MAX_DISCOUNT_PCT, Math.max(0, Math.round(patch.pct)));
      store.write({ ...s, packages: { ...s.packages, [id]: next } });
    },

    /** Рабочие дни мастера (0 = понедельник … 6 = воскресенье). */
    setMasterDays(id: string, days: number[]) {
      const s = store.read();
      store.write({ ...s, schedule: { ...s.schedule, [id]: [...new Set(days)].sort((a, b) => a - b) } });
    },

    setPromo(promo: { on: boolean; text?: Partial<L> }) {
      const s = store.read();
      store.write({ ...s, promo: { ...s.promo, ...promo } });
    },

    /**
     * Наполнить демо записями и событиями за прошлую неделю — чтобы кабинет не был пустым.
     * Сливает с текущим состоянием: записи с сайта остаются сверху (статус не трогаем), правки цен,
     * графика и акции сохраняются; старые демо-записи и демо-события заменяются новыми.
     */
    seed(seedBookings: SeedBooking[], salt = 17) {
      const now = Date.now();
      const events: DemoEvent[] = [];
      // Детерминированный «шум»: один и тот же демо-кабинет у всех, кто его открывает.
      let seedRnd = salt;
      const rnd = () => ((seedRnd = (seedRnd * 9301 + 49297) % 233280), seedRnd / 233280);
      const spread = (base: number, type: EventType, count: number) => {
        for (let i = 0; i < count; i++) events.push({ at: new Date(base - rnd() * DAY_MS).toISOString(), type });
      };
      for (let d = 6; d >= 0; d--) {
        const base = now - d * DAY_MS;
        spread(base, "view", 80 + Math.round(rnd() * 90));
        spread(base, "call", 6 + Math.round(rnd() * 8));
        spread(base, "telegram", 4 + Math.round(rnd() * 7));
        spread(base, "route", 2 + Math.round(rnd() * 4));
        spread(base, "quiz", 7 + Math.round(rnd() * 10));
        spread(base, "look", 12 + Math.round(rnd() * 14));
      }
      const bookings: Booking[] = seedBookings.map((b, i) => ({ ...b, id: `s${i}`, source: "seed" as const }));
      for (const b of bookings) events.push({ at: b.at, type: "booking" });

      const prev = store.read();
      const siteBookings = prev.bookings.filter((b) => b.source === "site");
      const siteAts = new Set(siteBookings.map((b) => b.at));
      // Прошлое наполнение датирует все события раньше своего seededAt: всё новее — реальные клики.
      const kept = prev.events.filter((e) => !prev.seededAt || e.at >= prev.seededAt || siteAts.has(e.at));
      const merged = [...events, ...kept].sort((a, b) => a.at.localeCompare(b.at));
      store.write({ ...prev, bookings: [...siteBookings, ...bookings], events: merged, seededAt: new Date().toISOString() });
    },
  };
}

export type SalonDemo = ReturnType<typeof createDemo>;

/** Хранилище одного бизнеса: хук состояния и действия. */
export interface SalonStore {
  useState: () => SalonState;
  demo: SalonDemo;
}

function createSalonStore(style: StyleId): SalonStore {
  const store = createPersistedStore<SalonState>({
    key: storeKey(style),
    empty: EMPTY,
    normalize: (raw) => ({ ...EMPTY, ...(raw as Partial<SalonState>) }),
  });
  return { useState: store.useStore, demo: createDemo(store) };
}

/** У барбершопа (A) и салона красоты (B) свои записи, правки и события: данные не смешиваются. */
export const salonStores: Record<StyleId, SalonStore> = { a: createSalonStore("a"), b: createSalonStore("b") };

/** Запомнить, какой бизнес смотрели (для кабинета). Без localStorage молча ничего не делает. */
export function rememberStyle(style: StyleId): void {
  try {
    localStorage.setItem(LAST_STYLE_KEY, style);
  } catch {
    /* приватный режим: кабинет откроется на барбершопе */
  }
}

export function lastStyle(): StyleId {
  try {
    return localStorage.getItem(LAST_STYLE_KEY) === "b" ? "b" : "a";
  } catch {
    return "a";
  }
}
