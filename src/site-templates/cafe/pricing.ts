import { addDays, fromMinutes, toMinutes } from "../kit/tashkent";
import { OPTIONS, OPTION_KINDS, type OptionKind } from "./data";

/**
 * Чистая логика заказа «заберу сам»: цена с опциями, корзина, время получения, печати лояльности.
 * Без React и хранилища — сайт, кабинет и тесты зовут один и тот же код.
 */

/** Выбранные опции напитка: id по группам. Не заданное = значение по умолчанию. */
export type Selection = Partial<Record<OptionKind, string>>;

export interface CartLine {
  key: string;
  itemId: string;
  qty: number;
  sel: Selection;
}

/** Цена и набор опций позиции — подставляет сайт (с учётом правок кабинета). */
export interface Pricing {
  price: (itemId: string) => number;
  kinds: (itemId: string) => OptionKind[];
}

/** Подставляет значения по умолчанию и отбрасывает неизвестные id и лишние группы. */
export function normalizeSelection(kinds: OptionKind[], sel: Selection = {}): Selection {
  const out: Selection = {};
  for (const kind of kinds) {
    const group = OPTIONS[kind];
    const wanted = sel[kind];
    out[kind] = group.choices.some((c) => c.id === wanted) ? wanted : group.def;
  }
  return out;
}

/** Доплата за один выбранный вариант, сум. */
export function optionDelta(kind: OptionKind, choiceId: string | undefined): number {
  const group = OPTIONS[kind];
  return group.choices.find((c) => c.id === (choiceId ?? group.def))?.delta ?? 0;
}

/** Цена одной порции: база + доплаты по выбранным опциям (не меньше 0). */
export function unitPrice(base: number, kinds: OptionKind[], sel: Selection = {}): number {
  const extra = kinds.reduce((sum, kind) => sum + optionDelta(kind, sel[kind]), 0);
  return Math.max(0, Math.round(base + extra));
}

export function lineKey(itemId: string, sel: Selection): string {
  return [itemId, ...OPTION_KINDS.filter((k) => sel[k]).map((k) => `${k}:${sel[k]}`)].join("|");
}

/** Добавить позицию: такая же (с теми же опциями) увеличивает количество. Возвращает новый массив. */
export function addLine(lines: CartLine[], itemId: string, sel: Selection, qty = 1): CartLine[] {
  if (qty <= 0) return lines;
  const key = lineKey(itemId, sel);
  const found = lines.find((l) => l.key === key);
  if (found) return lines.map((l) => (l.key === key ? { ...l, qty: l.qty + qty } : l));
  return [...lines, { key, itemId, qty, sel }];
}

/** Задать количество строки; 0 и меньше убирает её. */
export function setLineQty(lines: CartLine[], key: string, qty: number): CartLine[] {
  if (qty <= 0) return lines.filter((l) => l.key !== key);
  return lines.map((l) => (l.key === key ? { ...l, qty: Math.round(qty) } : l));
}

export const cartCount = (lines: CartLine[]): number => lines.reduce((n, l) => n + l.qty, 0);

export const lineUnit = (line: CartLine, p: Pricing): number => unitPrice(p.price(line.itemId), p.kinds(line.itemId), line.sel);

export const cartSubtotal = (lines: CartLine[], p: Pricing): number => lines.reduce((sum, l) => sum + lineUnit(l, p) * l.qty, 0);

/** Сколько штук позиции уже в корзине (по всем вариантам опций). */
export const qtyOfItem = (lines: CartLine[], itemId: string): number => lines.filter((l) => l.itemId === itemId).reduce((n, l) => n + l.qty, 0);

/** Скидка «6-й кофе бесплатно»: одна самая дешёвая порция кофе из корзины. 0, если кофе нет. */
export function freeCupDiscount(lines: CartLine[], p: Pricing, isCoffee: (itemId: string) => boolean): number {
  const prices = lines.filter((l) => isCoffee(l.itemId)).map((l) => lineUnit(l, p));
  return prices.length ? Math.min(...prices) : 0;
}

/* ——— время получения ——— */

/** Минимальный запас на приготовление, минут. */
export const PICKUP_LEAD = 10;
/** Шаг сетки времени в списке «или время». */
export const PICKUP_STEP = 15;
/** Быстрые варианты «через N минут». */
export const PICKUP_QUICK = [10, 20, 30] as const;
/** Последний заказ принимается за столько минут до закрытия. */
export const LAST_ORDER_BEFORE_CLOSE = 10;

export interface PickupPlan {
  /** Кофейня сейчас принимает заказы «через N минут». */
  openNow: boolean;
  /** Дата получения (YYYY-MM-DD): сегодня или завтра, если уже поздно. */
  date: string;
  /** Быстрые варианты, пусты когда закрыто. */
  quick: { minutes: number; time: string }[];
  /** Сетка времени на выбор. */
  slots: string[];
}

const ceilTo = (n: number, step: number) => Math.ceil(n / step) * step;

/** Что можно выбрать как время получения при заданном «сейчас» по Ташкенту. */
export function planPickup(now: { iso: string; minutes: number }, hours: { open: string; close: string }): PickupPlan {
  const openMin = toMinutes(hours.open);
  const last = toMinutes(hours.close) - LAST_ORDER_BEFORE_CLOSE;
  const grid = (from: number) => {
    const slots: string[] = [];
    for (let m = from; m <= last; m += PICKUP_STEP) slots.push(fromMinutes(m));
    return slots;
  };
  if (now.minutes < openMin) return { openNow: false, date: now.iso, quick: [], slots: grid(openMin) };
  if (now.minutes + PICKUP_LEAD > last) return { openNow: false, date: addDays(now.iso, 1), quick: [], slots: grid(openMin) };
  const quick = PICKUP_QUICK.filter((n) => now.minutes + n <= last).map((minutes) => ({ minutes, time: fromMinutes(ceilTo(now.minutes + minutes, 5)) }));
  return { openNow: true, date: now.iso, quick, slots: grid(ceilTo(now.minutes + PICKUP_LEAD, PICKUP_STEP)) };
}

/** Время допустимо: есть среди быстрых вариантов или в сетке. */
export function isValidPickup(plan: PickupPlan, time: string): boolean {
  return plan.slots.includes(time) || plan.quick.some((q) => q.time === time);
}

/* ——— лояльность ——— */

/** Сколько печатей на карте до бесплатного кофе. */
export const STAMPS_GOAL = 6;

export const freeCupReady = (stamps: number): boolean => stamps >= STAMPS_GOAL;

/** Печати после заказа: обычный заказ добавляет одну (не больше цели); заказ с бесплатным кофе обнуляет карту. */
export function stampsAfterOrder(stamps: number, redeemed: boolean): number {
  if (redeemed) return 0;
  return Math.min(STAMPS_GOAL, Math.max(0, stamps) + 1);
}

/* ——— текст заказа ——— */

export interface OrderTextLine {
  name: string;
  qty: number;
  /** «M, овсяное, ваниль» — выбранные опции словами. */
  opts: string;
  sum: string;
}

/** Текст заказа для Telegram: одинаковый по структуре на любом языке (подписи подставляет вызывающий). */
export function buildOrderText(p: { shop: string; lines: OrderTextLine[]; total: string; pickupLabel: string; pickupWord: string; totalWord: string; name: string; phone: string }): string {
  const rows = p.lines.map((l) => `• ${l.name}${l.opts ? ` (${l.opts})` : ""} ×${l.qty} — ${l.sum}`);
  return [`${p.shop}`, ...rows, `${p.totalWord}: ${p.total}`, `${p.pickupWord}: ${p.pickupLabel}`, `${p.name}, ${p.phone}`].join("\n");
}

export const telegramLink = (handle: string, text: string): string => `https://t.me/${handle}?text=${encodeURIComponent(text)}`;
