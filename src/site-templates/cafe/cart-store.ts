"use client";

import { useSyncExternalStore } from "react";
import { addLine, setLineQty, type CartLine, type Selection } from "./pricing";

/**
 * Корзина в памяти страницы (не в localStorage: корзина живёт один визит). Один объект на вкладку,
 * им пользуются карточки меню, шапка, плавающая кнопка и сама шторка заказа.
 */
export interface CartUi {
  lines: CartLine[];
  /** Шторка корзины открыта. */
  open: boolean;
  /** Позиция, у которой открыт выбор опций. */
  optionsFor: string | null;
}

const EMPTY: CartUi = { lines: [], open: false, optionsFor: null };
let state: CartUi = EMPTY;
const listeners = new Set<() => void>();

function set(next: CartUi) {
  state = next;
  listeners.forEach((l) => l());
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

export const useCart = (): CartUi => useSyncExternalStore(subscribe, () => state, () => EMPTY);

export const cartStore = {
  add(itemId: string, sel: Selection, qty = 1) {
    set({ ...state, lines: addLine(state.lines, itemId, sel, qty) });
  },
  setQty(key: string, qty: number) {
    set({ ...state, lines: setLineQty(state.lines, key, qty) });
  },
  /** Заменить строки целиком (после проверки остатков). */
  setLines(lines: CartLine[]) {
    set({ ...state, lines });
  },
  clear() {
    set({ ...state, lines: [] });
  },
  openCart() {
    set({ ...state, open: true, optionsFor: null });
  },
  closeCart() {
    set({ ...state, open: false });
  },
  openOptions(itemId: string) {
    set({ ...state, optionsFor: itemId });
  },
  closeOptions() {
    set({ ...state, optionsFor: null });
  },
};
