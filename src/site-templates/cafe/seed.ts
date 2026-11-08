import { fromMinutes, tashkentNow, toMinutes } from "../kit/tashkent";
import { lineKey, normalizeSelection, unitPrice, type Selection } from "./pricing";
import { itemById } from "./data";
import type { Order, OrderLine, OrderStatus } from "./store";

/** Демо-заказы за неделю для кабинета: детерминированы, ложатся на «сегодня» относительно now. */

const NAMES = ["Алина", "Тимур", "Мадина", "Сардор", "Камола", "Жасур", "Нилуфар", "Азиз", "Дильноза", "Рустам", "Малика", "Бобур", "Севара", "Улугбек", "Зарина", "Отабек"];

type Basket = { id: string; qty?: number; sel?: Selection }[];

const BASKETS: Basket[] = [
  [{ id: "flat-white", sel: { milk: "oat" } }, { id: "croissant" }],
  [{ id: "raf", sel: { size: "l" } }],
  [{ id: "cappuccino" }, { id: "cappuccino", sel: { size: "s" } }],
  [{ id: "iced-latte", sel: { syrup: "caramel" } }],
  [{ id: "flat-white" }, { id: "cheesecake" }],
  [{ id: "matcha-latte", sel: { milk: "oat" } }, { id: "syrniki" }],
  [{ id: "raf" }, { id: "brownie" }],
  [{ id: "flat-white", qty: 2 }],
  [{ id: "lemonade", sel: { size: "l" } }, { id: "avocado-toast" }],
  [{ id: "cappuccino", sel: { milk: "coconut" } }],
  [{ id: "iced-latte" }, { id: "cookie" }],
  [{ id: "breakfast" }, { id: "flat-white", sel: { milk: "oat" } }],
];

function toLines(basket: Basket): OrderLine[] {
  const lines: OrderLine[] = [];
  for (const b of basket) {
    const item = itemById(b.id);
    if (!item) continue;
    const sel = normalizeSelection(item.options, b.sel);
    const key = lineKey(item.id, sel);
    const found = lines.findIndex((l) => lineKey(l.itemId, l.sel) === key);
    const qty = b.qty ?? 1;
    if (found >= 0) lines[found] = { ...lines[found], qty: lines[found].qty + qty };
    else lines.push({ itemId: item.id, qty, unit: unitPrice(item.price, item.options, sel), sel });
  }
  return lines;
}

/** Время получения: через 15 минут после заказа, не ранее открытия и не позднее закрытия. */
function pickupFor(atMs: number, hours: { open: string; close: string }): { date: string; time: string } {
  const t = tashkentNow(atMs);
  const open = toMinutes(hours.open);
  const close = toMinutes(hours.close) - 10;
  const minutes = Math.min(close, Math.max(open, Math.ceil((t.minutes + 15) / 5) * 5));
  return { date: t.iso, time: fromMinutes(minutes) };
}

export function buildSeedOrders(now: number, hours: { open: string; close: string }): Order[] {
  const DAY = 86_400_000;
  return BASKETS.concat(BASKETS.slice(0, 6)).map((basket, i) => {
    const lines = toLines(basket);
    const at = now - (i * 0.4 + 0.05) * DAY;
    const total = lines.reduce((s, l) => s + l.unit * l.qty, 0);
    const status: OrderStatus = i === 0 ? "new" : i === 1 ? "cooking" : i === 2 ? "ready" : i % 7 === 5 ? "cancelled" : "done";
    const p = pickupFor(at, hours);
    return {
      id: `s${i}`,
      at: new Date(at).toISOString(),
      name: NAMES[i % NAMES.length],
      phone: `+998 90 ${String(100 + ((i * 37) % 900)).padStart(3, "0")}-${String(10 + ((i * 13) % 90)).padStart(2, "0")}-${String(10 + ((i * 29) % 90)).padStart(2, "0")}`,
      lines,
      total,
      pickupDate: p.date,
      pickupTime: p.time,
      free: false,
      status,
      source: "seed" as const,
    };
  });
}
