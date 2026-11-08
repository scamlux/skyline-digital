"use client";

import { createPersistedStore } from "../kit/persisted-store";
import type { L } from "../types";
import { stampsAfterOrder, type Selection } from "./pricing";
import { itemById } from "./data";

/**
 * Демо-хранилище кофейни: заказы «заберу сам», печати лояльности, остатки витрины и правки
 * владельца (цены, «нет сегодня», скрытие, акция). Живёт в localStorage браузера, который смотрит
 * демо: сайт и кабинет работают с одним объектом, заказ с сайта появляется в кабинете, «нет сегодня»
 * и счётчик витрины сразу видны на сайте. Ничего не уходит на сервер. В боевом сайте тот же
 * интерфейс реализуется поверх базы (ADR 0009).
 */
export const STORE_KEY = "skyline-demo-cafe-v1";

export type OrderStatus = "new" | "cooking" | "ready" | "done" | "cancelled";

export interface OrderLine {
  itemId: string;
  qty: number;
  /** Цена одной порции на момент заказа, сум. */
  unit: number;
  sel: Selection;
}

export interface Order {
  id: string;
  /** ISO-время создания. */
  at: string;
  name: string;
  phone: string;
  lines: OrderLine[];
  /** Итог к оплате (с учётом бесплатного кофе), сум. */
  total: number;
  /** Дата и время получения по Ташкенту. */
  pickupDate: string;
  pickupTime: string;
  /** Заказ с бесплатным кофе по карте лояльности. */
  free: boolean;
  status: OrderStatus;
  source: "site" | "seed";
}

export type EventType = "view" | "call" | "telegram" | "route" | "order" | "stamp" | "redeem";

export interface DemoEvent {
  at: string;
  type: EventType;
}

export interface ItemOverride {
  price?: number;
  /** true — «нет сегодня»: позиция видна, но не заказывается. */
  off?: boolean;
  /** true — скрыта с сайта. */
  hidden?: boolean;
}

export interface CafeState {
  items: Record<string, ItemOverride>;
  /** Остатки витрины, шт. Нет записи — берётся значение из данных. */
  stock: Record<string, number>;
  promo?: { on: boolean; text?: Partial<L> };
  orders: Order[];
  events: DemoEvent[];
  /** Печати на карте посетителя (0…STAMPS_GOAL). */
  stamps: number;
  seededAt?: string;
}

const EMPTY: CafeState = { items: {}, stock: {}, orders: [], events: [], stamps: 0 };

const store = createPersistedStore<CafeState>({
  key: STORE_KEY,
  empty: EMPTY,
  normalize: (raw) => ({ ...EMPTY, ...(raw as Partial<CafeState>) }),
});

/** Состояние демо; на сервере и до гидрации пустое (разметка совпадает с серверной). */
export const useCafeState = store.useStore;

export type NewOrder = Omit<Order, "id" | "at" | "status" | "source">;

const DAY_MS = 86_400_000;
const MAX_EVENTS = 800;
let orderCounter = 0;

/** Остаток витринной позиции; undefined — без ограничения (кофе, завтраки). */
export function stockOf(state: Pick<CafeState, "stock">, itemId: string): number | undefined {
  const base = itemById(itemId)?.stock;
  if (base === undefined) return undefined;
  return state.stock[itemId] ?? base;
}

const pushEvents = (events: DemoEvent[], at: string, types: EventType[]): DemoEvent[] => [...events, ...types.map((type) => ({ at, type }))].slice(-MAX_EVENTS);

export const demo = {
  get: store.read,

  /** Чистый лист: пусто, но демо считается заполненным — кабинет не наполнится сам. */
  reset() {
    store.write({ ...EMPTY, seededAt: new Date().toISOString() });
  },

  track(type: EventType) {
    const s = store.read();
    store.write({ ...s, events: pushEvents(s.events, new Date().toISOString(), [type]) });
  },

  /**
   * Заказ с сайта. Если витринной позиции стало меньше, чем в заказе (вторая вкладка, правка в кабинете),
   * возвращает null — корзина покажет «закончилось». Уменьшает остатки, ставит печать лояльности
   * (или списывает бесплатный кофе).
   */
  addOrder(input: NewOrder, redeem: boolean): Order | null {
    const s = store.read();
    const nextStock = { ...s.stock };
    for (const line of input.lines) {
      const left = stockOf({ stock: nextStock }, line.itemId);
      if (left === undefined) continue;
      const need = input.lines.filter((l) => l.itemId === line.itemId).reduce((n, l) => n + l.qty, 0);
      if (need > left) return null;
    }
    for (const line of input.lines) {
      const left = stockOf({ stock: nextStock }, line.itemId);
      if (left !== undefined) nextStock[line.itemId] = Math.max(0, left - line.qty);
    }
    const at = new Date().toISOString();
    orderCounter += 1;
    const order: Order = { ...input, id: `o${Date.now().toString(36)}${orderCounter.toString(36)}`, at, status: "new", source: "site", free: redeem };
    store.write({
      ...s,
      stock: nextStock,
      stamps: stampsAfterOrder(s.stamps, redeem),
      orders: [order, ...s.orders],
      events: pushEvents(s.events, at, ["order", redeem ? "redeem" : "stamp"]),
    });
    return order;
  },

  setStatus(id: string, status: OrderStatus) {
    const s = store.read();
    store.write({ ...s, orders: s.orders.map((o) => (o.id === id ? { ...o, status } : o)) });
  },

  /** Правка позиции: цена (целое ≥ 0), «нет сегодня», скрытие. */
  setItem(id: string, patch: ItemOverride) {
    const s = store.read();
    const next: ItemOverride = { ...s.items[id], ...patch };
    if (patch.price !== undefined) next.price = Math.max(0, Math.round(patch.price));
    store.write({ ...s, items: { ...s.items, [id]: next } });
  },

  /** Остаток витрины, шт (целое ≥ 0). */
  setStock(id: string, count: number) {
    const s = store.read();
    store.write({ ...s, stock: { ...s.stock, [id]: Math.max(0, Math.round(count)) } });
  },

  setPromo(promo: { on: boolean; text?: Partial<L> }) {
    const s = store.read();
    store.write({ ...s, promo: { ...s.promo, ...promo } });
  },

  /** Демо-кнопка «+1 печать» без заказа — чтобы показать, как открывается бесплатный кофе. */
  addStamp() {
    const s = store.read();
    store.write({ ...s, stamps: stampsAfterOrder(s.stamps, false), events: pushEvents(s.events, new Date().toISOString(), ["stamp"]) });
  },

  /**
   * Наполнить демо заказами и событиями за прошлую неделю — чтобы кабинет не был пустым.
   * Сливает с текущим состоянием: заказы с сайта остаются сверху (статус не трогаем), правки цен,
   * остатки, печати и акция сохраняются; старые демо-заказы и демо-события заменяются новыми.
   */
  seed(seedOrders: Order[]) {
    const now = Date.now();
    const events: DemoEvent[] = [];
    // Детерминированный «шум»: один и тот же демо-кабинет у всех, кто его открывает.
    let seedRnd = 29;
    const rnd = () => ((seedRnd = (seedRnd * 9301 + 49297) % 233280), seedRnd / 233280);
    const spread = (base: number, type: EventType, count: number) => {
      for (let i = 0; i < count; i++) events.push({ at: new Date(base - rnd() * DAY_MS).toISOString(), type });
    };
    for (let d = 6; d >= 0; d--) {
      const base = now - d * DAY_MS;
      spread(base, "view", 90 + Math.round(rnd() * 80));
      spread(base, "call", 4 + Math.round(rnd() * 6));
      spread(base, "telegram", 3 + Math.round(rnd() * 6));
      spread(base, "route", 2 + Math.round(rnd() * 4));
    }
    for (const o of seedOrders) {
      events.push({ at: o.at, type: "order" }, { at: o.at, type: o.free ? "redeem" : "stamp" });
    }
    const prev = store.read();
    const siteOrders = prev.orders.filter((o) => o.source === "site");
    const siteAts = new Set(siteOrders.map((o) => o.at));
    // Прошлое наполнение датирует все события раньше своего seededAt: всё новее — реальные клики.
    const kept = prev.events.filter((e) => !prev.seededAt || e.at >= prev.seededAt || siteAts.has(e.at));
    const merged = [...events, ...kept].sort((a, b) => a.at.localeCompare(b.at));
    store.write({ ...prev, orders: [...siteOrders, ...seedOrders], events: merged, seededAt: new Date().toISOString() });
  },
};
