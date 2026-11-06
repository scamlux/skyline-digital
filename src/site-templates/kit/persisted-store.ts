"use client";

import { useSyncExternalStore } from "react";

/**
 * Фабрика демо-хранилища в localStorage с подпиской для React (useSyncExternalStore).
 *
 * Состояние живёт в браузере того, кто смотрит демо; сайт и кабинет читают один и тот же
 * объект, а событие `storage` синхронизирует соседние вкладки. На сервере и до гидрации
 * хук отдаёт `empty` — разметка совпадает с серверной. В боевом сайте ту же пару
 * «read/write» реализуют поверх базы, UI не меняется (ADR 0009).
 */
export function createPersistedStore<S>(opts: { key: string; empty: S; normalize: (raw: unknown) => S }) {
  const { key, empty, normalize } = opts;
  let cache: S | null = null;
  const listeners = new Set<() => void>();

  function read(): S {
    if (cache) return cache;
    try {
      const raw = localStorage.getItem(key);
      cache = raw ? normalize(JSON.parse(raw)) : empty;
    } catch {
      cache = empty;
    }
    return cache;
  }

  function write(next: S) {
    cache = next;
    try {
      localStorage.setItem(key, JSON.stringify(next));
    } catch {
      /* приватный режим — состояние живёт до перезагрузки */
    }
    listeners.forEach((l) => l());
  }

  function subscribe(l: () => void) {
    listeners.add(l);
    const onStorage = (e: StorageEvent) => {
      if (e.key === key) {
        cache = null;
        l();
      }
    };
    window.addEventListener("storage", onStorage);
    return () => {
      listeners.delete(l);
      window.removeEventListener("storage", onStorage);
    };
  }

  /** Состояние демо; на сервере и до гидрации — пустое. */
  function useStore(): S {
    return useSyncExternalStore(subscribe, read, () => empty);
  }

  return { read, write, useStore };
}
