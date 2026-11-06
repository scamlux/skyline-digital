"use client";

import { useSyncExternalStore } from "react";

const noopSubscribe = () => () => {};

/** false на сервере и при гидрации, true после — без setState в эффекте. */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
}

const MINUTE = 60_000;
const subscribeMinute = (cb: () => void) => {
  const id = window.setInterval(cb, 20_000);
  return () => window.clearInterval(id);
};

/**
 * Текущая минута (мс, кратно минуте): стабильный примитив для useSyncExternalStore.
 * Обновляется раз в 20 с; на сервере и при гидрации — 0 (значит «время ещё неизвестно»).
 */
export function useMinuteClock(): number {
  return useSyncExternalStore(
    subscribeMinute,
    () => Math.floor(Date.now() / MINUTE) * MINUTE,
    () => 0,
  );
}
