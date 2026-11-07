"use client";

import { createPersistedStore } from "../kit/persisted-store";
import type { L } from "../types";
import type { BusySlot } from "./schedule";

/**
 * Демо-хранилище клиники: записи с сайта, события, правки владельца (цены, скрытые услуги,
 * приёмные дни врачей, акция). Живёт в localStorage браузера, который смотрит демо, — сайт
 * и кабинет работают с одним объектом: запись с сайта появляется в кабинете, выходной врача
 * из кабинета убирает слоты на сайте. Ничего не уходит на сервер. В боевом сайте тот же
 * интерфейс реализуется поверх базы (ADR 0009).
 */
export const STORE_KEY = "skyline-demo-clinic-v1";

export type BookingStatus = "new" | "confirmed" | "arrived" | "noshow" | "cancelled";

export interface Booking extends BusySlot {
  id: string;
  /** ISO-время создания записи. */
  at: string;
  name: string;
  phone: string;
  serviceId: string;
  /** Пациент выбрал «любой врач» — кабинет подпишет это рядом с назначенным врачом. */
  anyDoctor: boolean;
  /** Текст плана из калькулятора (если записались «с этим планом»). */
  plan?: string;
  status: BookingStatus;
  /** Откуда пришла запись: форма сайта или демо-наполнение. */
  source: "site" | "seed";
}

export type EventType = "view" | "call" | "telegram" | "route" | "calc" | "booking";

export interface DemoEvent {
  at: string;
  type: EventType;
}

export interface ServiceOverride {
  min?: number;
  max?: number;
  hidden?: boolean;
}

export interface ClinicState {
  services: Record<string, ServiceOverride>;
  schedule: Record<string, number[]>;
  promo?: { on: boolean; text?: Partial<L> };
  bookings: Booking[];
  events: DemoEvent[];
  /** Когда наполнили демо-данными — окно «за 7 дней» считается относительно текущего момента. */
  seededAt?: string;
}

const EMPTY: ClinicState = { services: {}, schedule: {}, bookings: [], events: [] };

const store = createPersistedStore<ClinicState>({
  key: STORE_KEY,
  empty: EMPTY,
  normalize: (raw) => ({ ...EMPTY, ...(raw as Partial<ClinicState>) }),
});

/** Состояние демо; на сервере и до гидрации пустое (разметка совпадает с серверной). */
export const useClinicState = store.useStore;

export type NewBooking = Omit<Booking, "id" | "at" | "status" | "source">;
export type SeedBooking = Omit<Booking, "id" | "source">;

const DAY_MS = 86_400_000;
const MAX_EVENTS = 800;
let bookingCounter = 0;

/** Слот врача уже занят живой записью. */
const isBusy = (bookings: Booking[], b: Omit<BusySlot, "status">) =>
  bookings.some((x) => x.status !== "cancelled" && x.doctorId === b.doctorId && x.date === b.date && x.time === b.time);

export const demo = {
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
   * Запись с сайта. Если слот врача успел занять другой посетитель (две вкладки) — null,
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

  /** Правка услуги. Вилка нормализуется: min ≥ 0, max ≥ min (правка одной границы подтягивает вторую). */
  setService(id: string, patch: ServiceOverride, base: { min: number; max: number }) {
    const s = store.read();
    const cur = { ...s.services[id], ...patch };
    const min = Math.max(0, Math.round(cur.min ?? base.min));
    const max = Math.max(min, Math.round(cur.max ?? base.max));
    const next: ServiceOverride = { ...cur };
    if (patch.min !== undefined || patch.max !== undefined) {
      next.min = min;
      next.max = max;
    }
    store.write({ ...s, services: { ...s.services, [id]: next } });
  },

  /** Приёмные дни врача (0 = пн … 5 = сб). */
  setDoctorDays(id: string, days: number[]) {
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
  seed(seedBookings: SeedBooking[]) {
    const now = Date.now();
    const events: DemoEvent[] = [];
    // Детерминированный «шум»: один и тот же демо-кабинет у всех, кто его открывает.
    let seedRnd = 11;
    const rnd = () => ((seedRnd = (seedRnd * 9301 + 49297) % 233280), seedRnd / 233280);
    const spread = (base: number, type: EventType, count: number) => {
      for (let i = 0; i < count; i++) events.push({ at: new Date(base - rnd() * DAY_MS).toISOString(), type });
    };
    for (let d = 6; d >= 0; d--) {
      const base = now - d * DAY_MS;
      spread(base, "view", 70 + Math.round(rnd() * 80));
      spread(base, "call", 5 + Math.round(rnd() * 7));
      spread(base, "telegram", 3 + Math.round(rnd() * 6));
      spread(base, "route", 2 + Math.round(rnd() * 4));
      spread(base, "calc", 6 + Math.round(rnd() * 9));
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
