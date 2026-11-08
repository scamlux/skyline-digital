import { itemById, menu, type MenuItem } from "./data";
import type { Pricing } from "./pricing";
import { stockOf, type CafeState } from "./store";

/**
 * Что сайт показывает по позиции с учётом правок кабинета. Чистые функции:
 * сайт, корзина и кабинет берут цену и доступность отсюда, поэтому правка видна везде одинаково.
 */
export interface Effective {
  item: MenuItem;
  price: number;
  hidden: boolean;
  /** «Нет сегодня» из кабинета. */
  off: boolean;
  /** Остаток витрины; undefined — без ограничения. */
  stock: number | undefined;
  soldOut: boolean;
  /** Можно заказать прямо сейчас. */
  orderable: boolean;
}

export function effective(item: MenuItem, state: Pick<CafeState, "items" | "stock">): Effective {
  const ov = state.items[item.id];
  const stock = stockOf(state, item.id);
  const hidden = ov?.hidden === true;
  const off = ov?.off === true;
  const soldOut = stock !== undefined && stock <= 0;
  return { item, price: ov?.price ?? item.price, hidden, off, stock, soldOut, orderable: !hidden && !off && !soldOut };
}

export const effectiveAll = (state: Pick<CafeState, "items" | "stock">): Effective[] => menu.map((m) => effective(m, state));

export function pricingFor(state: Pick<CafeState, "items" | "stock">): Pricing {
  return {
    price: (id) => {
      const item = itemById(id);
      return item ? effective(item, state).price : 0;
    },
    kinds: (id) => itemById(id)?.options ?? [],
  };
}

export const isCoffee = (id: string): boolean => itemById(id)?.cat === "coffee";
