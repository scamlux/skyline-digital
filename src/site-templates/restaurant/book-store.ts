"use client";

import { useSyncExternalStore } from "react";
import type { OccasionId, ZoneId } from "./schedule";
import type { SetLine } from "./sets";

/**
 * Состояние окна брони: открыто ли оно и с чем (число гостей, зона, повод, предзаказ).
 * Не сохраняется: окно открывается из любой кнопки сайта и каждый раз начинается заново.
 * `nonce` растёт при каждом открытии — окно по нему понимает, что пришёл новый выбор.
 */
export interface Wish {
  /** dish — одно блюдо («прийти на это»), set — собранный набор на компанию. */
  kind: "dish" | "set";
  refId: string;
  lines: SetLine[];
  /** Скидка набора, % (у блюда — 0). */
  discount: number;
}

export interface BookSeed {
  guests?: number;
  zone?: ZoneId;
  occasion?: OccasionId;
  wish?: Wish;
}

export interface BookState {
  open: boolean;
  nonce: number;
  seed: BookSeed;
}

const CLOSED: BookState = { open: false, nonce: 0, seed: {} };
let state: BookState = CLOSED;
const listeners = new Set<() => void>();

const set = (next: BookState) => {
  state = next;
  listeners.forEach((l) => l());
};

export const bookStore = {
  get: () => state,
  open(seed: BookSeed = {}) {
    set({ open: true, nonce: state.nonce + 1, seed });
  },
  close() {
    if (state.open) set({ ...state, open: false });
  },
};

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

export const useBook = (): BookState => useSyncExternalStore(subscribe, bookStore.get, () => CLOSED);
