"use client";

import { useEffect, useRef } from "react";

const HOVER_TARGET = "a,button,[data-case]";

/**
 * Кастомный курсор Референса (эталон: `#rcursor`): точка идёт за мышью сразу,
 * кольцо догоняет с lerp 0.18 и растёт над ссылками/кнопками.
 * Включается только на устройствах с мышью и без reduced-motion — тогда же
 * на обёртке ставится `data-cursor="on"`, и CSS прячет системный курсор.
 */
export function RefCursor() {
  const rootRef = useRef<HTMLDivElement>(null);
  const dotRef = useRef<HTMLSpanElement>(null);
  const ringRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    const site = root?.closest<HTMLElement>('[data-site="ref"]');
    if (!root || !site) return;
    const mq = window.matchMedia("(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)");
    if (!mq.matches) return;

    let cx = window.innerWidth / 2;
    let cy = window.innerHeight / 2;
    let rx = cx;
    let ry = cy;
    let raf = 0;
    let shown = false;

    const move = (e: MouseEvent) => {
      cx = e.clientX;
      cy = e.clientY;
      if (!shown) {
        // Первое движение: кольцо стартует из точки мыши, а не из центра экрана.
        shown = true;
        rx = cx;
        ry = cy;
        site.dataset.cursor = "on";
      }
      if (dotRef.current) dotRef.current.style.transform = `translate3d(${cx}px,${cy}px,0) translate(-50%,-50%)`;
    };
    const loop = () => {
      rx += (cx - rx) * 0.18;
      ry += (cy - ry) * 0.18;
      if (ringRef.current) ringRef.current.style.transform = `translate3d(${rx}px,${ry}px,0) translate(-50%,-50%)`;
      raf = requestAnimationFrame(loop);
    };
    const over = (e: MouseEvent) => {
      if ((e.target as Element).closest?.(HOVER_TARGET)) root.classList.add("hover");
    };
    const out = (e: MouseEvent) => {
      if ((e.target as Element).closest?.(HOVER_TARGET)) root.classList.remove("hover");
    };
    // Мышь ушла за окно — вернуть системный курсор, чтобы не «залипало» кольцо у края.
    const leave = () => {
      shown = false;
      delete site.dataset.cursor;
    };

    document.addEventListener("mousemove", move, { passive: true });
    document.addEventListener("mouseover", over);
    document.addEventListener("mouseout", out);
    document.documentElement.addEventListener("mouseleave", leave);
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("mousemove", move);
      document.removeEventListener("mouseover", over);
      document.removeEventListener("mouseout", out);
      document.documentElement.removeEventListener("mouseleave", leave);
      delete site.dataset.cursor;
    };
  }, []);

  return (
    <div ref={rootRef} className="r-cursor" aria-hidden="true">
      <span ref={dotRef} className="rc-dot" />
      <span ref={ringRef} className="rc-ring" />
    </div>
  );
}
