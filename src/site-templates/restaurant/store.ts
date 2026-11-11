"use client";

import { useSyncExternalStore } from "react";
import type { L } from "../types";

/**
 * Демо-хранилище ресторана: правки владельца и события сайта живут в localStorage
 * браузера, который смотрит демо. Так сайт и кабинет показывают один «живой» сценарий:
 * бронь с сайта появляется в заявках, цена из кабинета — в меню. Ничего не уходит на
 * сервер. В боевом сайте этот же интерфейс реализуется поверх базы (ADR 0009).
 */
export const STORE_KEY = "skyline-demo-restaurant-v1";

export type LeadStatus = "new" | "confirmed" | "done" | "cancelled";

export interface Lead {
  id: string;
  /** ISO-время создания. */
  at: string;
  name: string;
  phone: string;
  when: string;
  guests: string;
  status: LeadStatus;
  /** Откуда пришла заявка: форма сайта или демо-наполнение. */
  source: "site" | "seed";
}

export type EventType = "view" | "call" | "telegram" | "route" | "lead";

export interface DemoEvent {
  at: string;
  type: EventType;
}

export interface ItemOverride {
  price?: number;
  /** false — стоп-лист. */
  available?: boolean;
  /** true — скрыто с сайта (не показывается вовсе). */
  hidden?: boolean;
}

export interface DemoState {
  items: Record<string, ItemOverride>;
  hours?: { open: string; close: string };
  promo?: { on: boolean; text?: Partial<L> };
  leads: Lead[];
  events: DemoEvent[];
  /** Когда наполнили демо-данными — чтобы показывать «за 7 дней» относительно него. */
  seededAt?: string;
}

const EMPTY: DemoState = { items: {}, leads: [], events: [] };

let cache: DemoState | null = null;
const listeners = new Set<() => void>();

function read(): DemoState {
  if (cache) return cache;
  try {
    const raw = localStorage.getItem(STORE_KEY);
    cache = raw ? { ...EMPTY, ...(JSON.parse(raw) as DemoState) } : EMPTY;
  } catch {
    cache = EMPTY;
  }
  return cache;
}

function write(next: DemoState) {
  cache = next;
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(next));
  } catch {
    /* приватный режим — состояние живёт до перезагрузки */
  }
  listeners.forEach((l) => l());
}

function subscribe(l: () => void) {
  listeners.add(l);
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORE_KEY) {
      cache = null;
      l();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(l);
    window.removeEventListener("storage", onStorage);
  };
}

/** Состояние демо; на сервере и до гидрации — пустое (разметка совпадает с серверной). */
export function useDemoState(): DemoState {
  return useSyncExternalStore(subscribe, read, () => EMPTY);
}

export const demo = {
  get: read,
  /** Начать с чистого листа: пусто, но demo считается заполненным — кабинет не наполнится сам. */
  reset() {
    write({ ...EMPTY, seededAt: new Date().toISOString() });
  },
  track(type: EventType) {
    const s = read();
    write({ ...s, events: [...s.events.slice(-499), { at: new Date().toISOString(), type }] });
  },
  addLead(lead: Omit<Lead, "id" | "at" | "status" | "source">) {
    const s = read();
    const item: Lead = { ...lead, id: `l${Date.now().toString(36)}`, at: new Date().toISOString(), status: "new", source: "site" };
    write({ ...s, leads: [item, ...s.leads], events: [...s.events, { at: item.at, type: "lead" }] });
    return item;
  },
  setLeadStatus(id: string, status: LeadStatus) {
    const s = read();
    write({ ...s, leads: s.leads.map((l) => (l.id === id ? { ...l, status } : l)) });
  },
  setItem(id: string, patch: ItemOverride) {
    const s = read();
    write({ ...s, items: { ...s.items, [id]: { ...s.items[id], ...patch } } });
  },
  setHours(hours: { open: string; close: string }) {
    write({ ...read(), hours });
  },
  setPromo(promo: { on: boolean; text?: Partial<L> }) {
    write({ ...read(), promo: { ...read().promo, ...promo } });
  },
  /**
   * Наполнить демо заявками и событиями за прошлую неделю — чтобы кабинет не был пустым.
   * Сливает с текущим состоянием: заявки с сайта остаются сверху (статус не трогаем), правки меню,
   * часов и акции сохраняются; старые демо-заявки и демо-события заменяются новыми.
   */
  seed(seedLeads: Omit<Lead, "id" | "at" | "status" | "source">[]) {
    const now = Date.now();
    const day = 86_400_000;
    const events: DemoEvent[] = [];
    const leads: Lead[] = [];
    // Детерминированный «шум»: один и тот же демо-кабинет у всех, кто его открывает.
    let seedRnd = 7;
    const rnd = () => ((seedRnd = (seedRnd * 9301 + 49297) % 233280), seedRnd / 233280);
    for (let d = 6; d >= 0; d--) {
      const base = now - d * day;
      const views = 60 + Math.round(rnd() * 70);
      for (let i = 0; i < views; i++) events.push({ at: new Date(base - rnd() * day).toISOString(), type: "view" });
      for (let i = 0; i < 4 + Math.round(rnd() * 6); i++) events.push({ at: new Date(base - rnd() * day).toISOString(), type: "call" });
      for (let i = 0; i < 2 + Math.round(rnd() * 5); i++) events.push({ at: new Date(base - rnd() * day).toISOString(), type: "telegram" });
      for (let i = 0; i < 2 + Math.round(rnd() * 4); i++) events.push({ at: new Date(base - rnd() * day).toISOString(), type: "route" });
    }
    seedLeads.forEach((l, i) => {
      const at = new Date(now - (i * 0.7 + 0.3) * day).toISOString();
      const status: LeadStatus = i === 0 ? "new" : i % 4 === 3 ? "cancelled" : i < 3 ? "confirmed" : "done";
      leads.push({ ...l, id: `s${i}`, at, status, source: "seed" });
      events.push({ at, type: "lead" });
    });
    const prev = read();
    const siteLeads = prev.leads.filter((l) => l.source === "site");
    const siteAts = new Set(siteLeads.map((l) => l.at));
    // Прошлое наполнение все события датирует раньше своего seededAt: всё, что новее, — реальные клики.
    const kept = prev.events.filter((e) => !prev.seededAt || e.at >= prev.seededAt || siteAts.has(e.at));
    const merged = [...events, ...kept].sort((a, b) => a.at.localeCompare(b.at));
    write({ ...prev, leads: [...siteLeads, ...leads], events: merged, seededAt: new Date().toISOString() });
  },
};
