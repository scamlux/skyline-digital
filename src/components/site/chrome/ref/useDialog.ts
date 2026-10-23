"use client";

import { useEffect } from "react";

const FOCUSABLE = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Общее поведение полноэкранных слоёв Референса (меню, кейс): пока `open` —
 * скролл страницы заблокирован, Esc закрывает, Tab не уходит за пределы слоя,
 * фокус ставится внутрь. После закрытия фокус возвращается туда, откуда открыли.
 */
export function useDialog(open: boolean, ref: React.RefObject<HTMLElement | null>, onClose: () => void) {
  useEffect(() => {
    const el = ref.current;
    if (!open || !el) return;
    const back = document.activeElement as HTMLElement | null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const items = () => Array.from(el.querySelectorAll<HTMLElement>(FOCUSABLE));
    // Ждём кадр: слой только что стал видимым (visibility/hidden снимаются стилем).
    const raf = requestAnimationFrame(() => items()[0]?.focus({ preventScroll: true }));

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key !== "Tab") return;
      const list = items();
      if (!list.length) return;
      const first = list[0];
      const last = list[list.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);

    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      if (back?.isConnected) back.focus({ preventScroll: true });
    };
  }, [open, ref, onClose]);
}
