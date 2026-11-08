"use client";

import { createPersistedStore } from "../kit/persisted-store";
import type { L } from "../types";
import { OCCASION_IDS, ZONE_IDS, type OccasionId, type ZoneId } from "./schedule";
import type { ItemOverride, SetOverride } from "./sets";

/**
 * Демо-хранилище ресторана: правки владельца и события сайта живут в localStorage браузера,
 * который смотрит демо. Сайт и кабинет показывают один «живой» сценарий: бронь с сайта появляется
 * в заявках, цена и стоп-лист из кабинета — в меню и в наборах. Ничего не уходит на сервер.
 * В боевом сайте тот же интерфейс реализуется поверх базы (ADR 0009).
 *
 * Ключ остался прежним (v1): новые поля необязательны, а normalize читает и старые записи —
 * без наборов, зон и поводов.
 */
export const STORE_KEY = "skyline-demo-restaurant-v1";

export type LeadStatus = "new" | "confirmed" | "done" | "cancelled";
const LEAD_STATUSES: LeadStatus[] = ["new", "confirmed", "done", "cancelled"];

export interface Lead {
  id: string;
  /** ISO-время создания. */
  at: string;
  name: string;
  phone: string;
  /** Дата и время брони по Ташкенту: YYYY-MM-DDTHH:MM (у демо-наполнения старых версий могло быть пусто). */
  when: string;
  /** Подпись гостей: «4», «3–4», «9+». */
  guests: string;
  zone?: ZoneId;
  occasion?: OccasionId;
  /** Предзаказ («прийти на это»): текстом на языке брони, без привязки к ценам на сегодня. */
  wish?: string;
  wishSum?: number;
  status: LeadStatus;
  /** Откуда пришла заявка: форма сайта или демо-наполнение. */
  source: "site" | "seed";
}

export type EventType = "view" | "call" | "telegram" | "route" | "lead";
const EVENT_TYPES: EventType[] = ["view", "call", "telegram", "route", "lead"];

export interface DemoEvent {
  at: string;
  type: EventType;
}

export interface DemoState {
  items: Record<string, ItemOverride>;
  sets: Record<string, SetOverride>;
  hours?: { open: string; close: string };
  promo?: { on: boolean; text?: Partial<L> };
  leads: Lead[];
  events: DemoEvent[];
  /** Когда наполнили демо-данными — чтобы показывать «за 7 дней» относительно него. */
  seededAt?: string;
}

const EMPTY: DemoState = { items: {}, sets: {}, leads: [], events: [] };
const MAX_EVENTS = 800;
const DAY_MS = 86_400_000;
const HHMM = /^\d{2}:\d{2}$/;

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const str = (v: unknown, fallback = ""): string => (typeof v === "string" ? v : typeof v === "number" ? String(v) : fallback);
const oneOf = <T extends string>(v: unknown, list: readonly T[]): T | undefined => (list as readonly unknown[]).includes(v) ? (v as T) : undefined;

function normalizeLead(raw: unknown): Lead | null {
  if (!isObj(raw) || typeof raw.id !== "string") return null;
  const wishSum = typeof raw.wishSum === "number" && Number.isFinite(raw.wishSum) ? raw.wishSum : undefined;
  return {
    id: raw.id,
    at: str(raw.at, new Date(0).toISOString()),
    name: str(raw.name),
    phone: str(raw.phone),
    when: str(raw.when),
    guests: str(raw.guests, "2"),
    zone: oneOf(raw.zone, ZONE_IDS),
    occasion: oneOf(raw.occasion, OCCASION_IDS),
    wish: typeof raw.wish === "string" && raw.wish ? raw.wish : undefined,
    wishSum,
    status: oneOf(raw.status, LEAD_STATUSES) ?? "new",
    source: raw.source === "seed" ? "seed" : "site",
  };
}

/** Читает сохранённое защитно: чужие или старые записи не должны ронять сайт и кабинет. */
export function normalizeState(raw: unknown): DemoState {
  const r = isObj(raw) ? raw : {};
  const items: Record<string, ItemOverride> = {};
  if (isObj(r.items)) for (const [id, v] of Object.entries(r.items)) if (isObj(v)) items[id] = v as ItemOverride;
  const sets: Record<string, SetOverride> = {};
  if (isObj(r.sets)) for (const [id, v] of Object.entries(r.sets)) if (isObj(v)) sets[id] = v as SetOverride;
  const hours = isObj(r.hours) && HHMM.test(str(r.hours.open)) && HHMM.test(str(r.hours.close)) ? { open: str(r.hours.open), close: str(r.hours.close) } : undefined;
  const promo = isObj(r.promo) && typeof r.promo.on === "boolean" ? { on: r.promo.on, text: isObj(r.promo.text) ? (r.promo.text as Partial<L>) : undefined } : undefined;
  const leads = Array.isArray(r.leads) ? r.leads.map(normalizeLead).filter((l): l is Lead => l !== null) : [];
  const events = Array.isArray(r.events)
    ? r.events.filter((e): e is DemoEvent => isObj(e) && typeof e.at === "string" && oneOf(e.type, EVENT_TYPES) !== undefined)
    : [];
  return { items, sets, hours, promo, leads, events, seededAt: typeof r.seededAt === "string" ? r.seededAt : undefined };
}

const store = createPersistedStore<DemoState>({ key: STORE_KEY, empty: EMPTY, normalize: normalizeState });

/** Состояние демо; на сервере и до гидрации — пустое (разметка совпадает с серверной). */
export const useDemoState = store.useStore;

export type NewLead = Omit<Lead, "id" | "at" | "status" | "source">;

let leadCounter = 0;
const withEvent = (events: DemoEvent[], at: string, type: EventType): DemoEvent[] => [...events, { at, type }].slice(-MAX_EVENTS);

export const demo = {
  get: store.read,

  /** Начать с чистого листа: пусто, но demo считается заполненным — кабинет не наполнится сам. */
  reset() {
    store.write({ ...EMPTY, seededAt: new Date().toISOString() });
  },

  track(type: EventType) {
    const s = store.read();
    store.write({ ...s, events: withEvent(s.events, new Date().toISOString(), type) });
  },

  addLead(lead: NewLead): Lead {
    const s = store.read();
    const at = new Date().toISOString();
    leadCounter += 1;
    const item: Lead = { ...lead, id: `l${Date.now().toString(36)}${leadCounter.toString(36)}`, at, status: "new", source: "site" };
    store.write({ ...s, leads: [item, ...s.leads], events: withEvent(s.events, at, "lead") });
    return item;
  },

  setLeadStatus(id: string, status: LeadStatus) {
    const s = store.read();
    store.write({ ...s, leads: s.leads.map((l) => (l.id === id ? { ...l, status } : l)) });
  },

  setItem(id: string, patch: ItemOverride) {
    const s = store.read();
    const next: ItemOverride = { ...s.items[id], ...patch };
    if (patch.price !== undefined) next.price = Math.max(0, Math.round(patch.price));
    store.write({ ...s, items: { ...s.items, [id]: next } });
  },

  /** Правка набора «на компанию»: включён, скидка, убранные блюда. */
  setSet(id: string, patch: SetOverride) {
    const s = store.read();
    const next: SetOverride = { ...s.sets[id], ...patch };
    if (patch.discount !== undefined) next.discount = Math.max(0, Math.round(patch.discount));
    store.write({ ...s, sets: { ...s.sets, [id]: next } });
  },

  setHours(hours: { open: string; close: string }) {
    store.write({ ...store.read(), hours });
  },

  setPromo(promo: { on: boolean; text?: Partial<L> }) {
    const s = store.read();
    store.write({ ...s, promo: { ...s.promo, ...promo } });
  },

  /**
   * Наполнить демо заявками и событиями за прошлую неделю — чтобы кабинет не был пустым.
   * Сливает с текущим состоянием: заявки с сайта остаются сверху (статус не трогаем), правки меню,
   * наборов, часов и акции сохраняются; старые демо-заявки и демо-события заменяются новыми.
   */
  seed(seedLeads: NewLead[]) {
    const now = Date.now();
    const events: DemoEvent[] = [];
    const leads: Lead[] = [];
    // Детерминированный «шум»: один и тот же демо-кабинет у всех, кто его открывает.
    let seedRnd = 7;
    const rnd = () => ((seedRnd = (seedRnd * 9301 + 49297) % 233280), seedRnd / 233280);
    const spread = (base: number, type: EventType, count: number) => {
      for (let i = 0; i < count; i++) events.push({ at: new Date(base - rnd() * DAY_MS).toISOString(), type });
    };
    for (let d = 6; d >= 0; d--) {
      const base = now - d * DAY_MS;
      spread(base, "view", 60 + Math.round(rnd() * 70));
      spread(base, "call", 4 + Math.round(rnd() * 6));
      spread(base, "telegram", 2 + Math.round(rnd() * 5));
      spread(base, "route", 2 + Math.round(rnd() * 4));
    }
    seedLeads.forEach((l, i) => {
      const at = new Date(now - (i * 0.7 + 0.3) * DAY_MS).toISOString();
      const status: LeadStatus = i === 0 ? "new" : i % 4 === 3 ? "cancelled" : i < 3 ? "confirmed" : "done";
      leads.push({ ...l, id: `s${i}`, at, status, source: "seed" });
      events.push({ at, type: "lead" });
    });
    const prev = store.read();
    const siteLeads = prev.leads.filter((l) => l.source === "site");
    const siteAts = new Set(siteLeads.map((l) => l.at));
    // Прошлое наполнение все события датирует раньше своего seededAt: всё, что новее, — реальные клики.
    const kept = prev.events.filter((e) => !prev.seededAt || e.at >= prev.seededAt || siteAts.has(e.at));
    const merged = [...events, ...kept].sort((a, b) => a.at.localeCompare(b.at));
    store.write({ ...prev, leads: [...siteLeads, ...leads], events: merged, seededAt: new Date().toISOString() });
  },
};
