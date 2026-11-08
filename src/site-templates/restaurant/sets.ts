import type { MenuCategory, MenuItem, SetPreset } from "./data";

/**
 * Блюда с правками владельца и конструктор набора «Что заказать на компанию».
 * Чистые функции: сайт, окно брони, кабинет и тесты считают одно и то же.
 */

export interface ItemOverride {
  price?: number;
  /** false — стоп-лист. */
  available?: boolean;
  /** true — скрыто с сайта. */
  hidden?: boolean;
}

export interface SetOverride {
  /** false — набор убран с сайта. */
  on?: boolean;
  /** Скидка, % (0…MAX_DISCOUNT). */
  discount?: number;
  /** Блюда, которые владелец убрал из набора. */
  off?: string[];
}

export interface Dish extends MenuItem {
  /** Цена с учётом правок владельца. */
  price: number;
  /** false — в стоп-листе или скрыто: в наборы и в предзаказ не попадает. */
  orderable: boolean;
  hidden: boolean;
}

export const MAX_GUESTS = 30;
export const MIN_GUESTS = 1;
export const MAX_QTY = 20;
export const MAX_DISCOUNT = 30;
/** Скидка округляется до тысячи сум — «красивая» сумма на экране и в сообщении. */
const DISCOUNT_ROUND = 1000;

/** Блюдо с учётом правок: цена, стоп-лист, скрытие. */
export function effectiveDish(item: MenuItem, overrides: Record<string, ItemOverride>): Dish {
  const o = overrides[item.id] ?? {};
  const available = o.available ?? item.available !== false;
  const hidden = o.hidden === true;
  return { ...item, price: o.price ?? item.price, orderable: available && !hidden, hidden };
}

export function dishIndex(menu: MenuCategory[], overrides: Record<string, ItemOverride>): Map<string, Dish> {
  const index = new Map<string, Dish>();
  for (const c of menu) for (const it of c.items) index.set(it.id, effectiveDish(it, overrides));
  return index;
}

export interface SetLine {
  id: string;
  qty: number;
}

export const clampGuests = (n: number): number => Math.min(MAX_GUESTS, Math.max(MIN_GUESTS, Math.round(n) || MIN_GUESTS));

/** Порций блюда на компанию: одна на `per` гостей, округление вверх, не меньше одной. */
export const portionsFor = (guests: number, per: number): number => Math.max(1, Math.ceil(clampGuests(guests) / Math.max(1, per)));

/** Набор с учётом правок владельца: включён ли, скидка, состав. */
export function resolveSet(preset: SetPreset, ov: SetOverride | undefined) {
  const off = new Set(ov?.off ?? []);
  const discount = Math.min(MAX_DISCOUNT, Math.max(0, Math.round(ov?.discount ?? preset.discount)));
  return { on: ov?.on !== false, discount, items: preset.items.filter((i) => !off.has(i.id)) };
}

/** Предложенный набор для компании. Блюда в стоп-листе и скрытые в набор не попадают. */
export function buildSet(preset: SetPreset, guests: number, dishes: Map<string, Dish>, ov?: SetOverride): SetLine[] {
  return resolveSet(preset, ov)
    .items.filter((i) => dishes.get(i.id)?.orderable)
    .map((i) => ({ id: i.id, qty: portionsFor(guests, i.per) }));
}

/** Строки, которые ещё можно заказать (после правок владельца), без нулевых количеств. */
export const liveLines = (lines: SetLine[], dishes: Map<string, Dish>): SetLine[] =>
  lines.filter((l) => l.qty > 0 && dishes.get(l.id)?.orderable);

export const subtotal = (lines: SetLine[], dishes: Map<string, Dish>): number =>
  liveLines(lines, dishes).reduce((sum, l) => sum + (dishes.get(l.id)?.price ?? 0) * l.qty, 0);

export const discountSum = (sub: number, percent: number): number => Math.round((sub * percent) / 100 / DISCOUNT_ROUND) * DISCOUNT_ROUND;

export function totalFor(lines: SetLine[], dishes: Map<string, Dish>, percent: number) {
  const sub = subtotal(lines, dishes);
  const off = Math.min(sub, discountSum(sub, percent));
  return { subtotal: sub, discount: off, total: sub - off };
}

/** Изменить количество блюда на delta (0 убирает строку, потолок — MAX_QTY). Новый массив. */
export function adjustQty(lines: SetLine[], id: string, delta: number): SetLine[] {
  return lines.flatMap((l) => {
    if (l.id !== id) return [l];
    const qty = Math.min(MAX_QTY, l.qty + delta);
    return qty > 0 ? [{ id, qty }] : [];
  });
}

/** Добавить блюдо (или +1, если уже есть). Новый массив. */
export function addDish(lines: SetLine[], id: string): SetLine[] {
  return lines.some((l) => l.id === id) ? adjustQty(lines, id, 1) : [...lines, { id, qty: 1 }];
}
