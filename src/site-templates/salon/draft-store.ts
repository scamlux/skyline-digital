"use client";

import { useSyncExternalStore } from "react";

/**
 * Предвыбор для формы записи: карточка работы («Хочу так же»), результат подбора образа,
 * кнопка мастера. Живёт только в памяти страницы: острова одной страницы разделяют общую
 * переменную, localStorage тут не нужен.
 */
export interface BookingDraft {
  serviceIds: string[];
  masterId: string | null;
  /** Образ из лукбука, если запись началась с него (попадёт в заявку и Telegram). */
  lookId: string | null;
  /** Растёт при каждой отправке: форма понимает, что пора подхватить новый выбор. */
  nonce: number;
}

const EMPTY: BookingDraft = { serviceIds: [], masterId: null, lookId: null, nonce: 0 };
let current: BookingDraft = EMPTY;
const listeners = new Set<() => void>();

export const bookingDraft = {
  get: () => current,
  send(preset: { serviceIds?: string[]; masterId?: string | null; lookId?: string | null }) {
    current = { serviceIds: preset.serviceIds ?? [], masterId: preset.masterId ?? null, lookId: preset.lookId ?? null, nonce: current.nonce + 1 };
    listeners.forEach((l) => l());
  },
  clear() {
    current = { ...EMPTY, nonce: current.nonce };
    listeners.forEach((l) => l());
  },
};

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

export const useBookingDraft = (): BookingDraft => useSyncExternalStore(subscribe, bookingDraft.get, () => EMPTY);

/** Перейти к форме записи: прокрутка к #book (уважает prefers-reduced-motion). */
export function goToBooking() {
  const el = document.getElementById("book");
  if (!el) return;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  el.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
  history.replaceState(null, "", "#book");
}
