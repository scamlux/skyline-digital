"use client";

import { useSyncExternalStore } from "react";

/**
 * «Страница загрузилась и браузер простаивает»: после этого можно тянуть второстепенное — фото ниже
 * первого экрана, чанк окна брони. Пока идёт загрузка, канал занят главным кадром и шрифтами,
 * и всё лишнее откладывает LCP на медленной сети. На сервере и при гидрации — false.
 */
let ready = false;
let armed = false;
const listeners = new Set<() => void>();

function arm() {
  if (armed || typeof window === "undefined") return;
  armed = true;
  const reveal = () => {
    const done = () => {
      ready = true;
      listeners.forEach((l) => l());
    };
    // Safari без requestIdleCallback: короткая пауза вместо него.
    const idle = (window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => void }).requestIdleCallback;
    if (idle) idle(done, { timeout: 1500 });
    else setTimeout(done, 300);
  };
  if (document.readyState === "complete") reveal();
  else window.addEventListener("load", reveal, { once: true });
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  arm();
  return () => listeners.delete(l);
};

export const useAfterLoad = (): boolean =>
  useSyncExternalStore(
    subscribe,
    () => ready,
    () => false,
  );
