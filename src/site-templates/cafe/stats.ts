import { itemById, type Cat } from "./data";
import type { DemoEvent, EventType, Order } from "./store";

/** Подсчёты для обзора кабинета — чистые функции без React, их же гоняют тесты. */

const DAY_MS = 86_400_000;
export const WEEK_MS = 7 * DAY_MS;

/** Заказы без отменённых, созданные в окне [from, to). */
export function ordersIn(orders: Order[], from: number, to: number): Order[] {
  return orders.filter((o) => o.status !== "cancelled" && Date.parse(o.at) >= from && Date.parse(o.at) < to);
}

export interface WeekStats {
  count: number;
  revenue: number;
  /** Средний чек, сум (0, если заказов нет). */
  avg: number;
}

export function periodStats(orders: Order[], from: number, to: number): WeekStats {
  const list = ordersIn(orders, from, to);
  const revenue = list.reduce((s, o) => s + o.total, 0);
  return { count: list.length, revenue, avg: list.length ? Math.round(revenue / list.length) : 0 };
}

const DRINK_CATS: Cat[] = ["coffee", "notcoffee"];

/** Самые заказываемые напитки (кофе и не кофе) за окно, по убыванию количества. */
export function topDrinks(orders: Order[], from: number, to: number, limit = 3): { itemId: string; qty: number }[] {
  const counts = new Map<string, number>();
  for (const o of ordersIn(orders, from, to))
    for (const l of o.lines) {
      const cat = itemById(l.itemId)?.cat;
      if (cat && DRINK_CATS.includes(cat)) counts.set(l.itemId, (counts.get(l.itemId) ?? 0) + l.qty);
    }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([itemId, qty]) => ({ itemId, qty }));
}

export const countEvents = (events: DemoEvent[], type: EventType, from: number, to: number): number =>
  events.filter((e) => e.type === type && Date.parse(e.at) >= from && Date.parse(e.at) < to).length;
