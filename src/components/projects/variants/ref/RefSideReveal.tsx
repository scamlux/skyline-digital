"use client";

import { useEffect } from "react";

const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

/**
 * Появление карточек сетки проектов с двух сторон, привязанное к скроллу:
 * левая колонка выезжает слева, правая — справа (средние в 3-колоночной сетке —
 * снизу), в одну колонку стороны чередуются. Карточка «встаёт на место», когда её
 * верх поднимается на ~55% высоты окна; при обратном скролле движение обратное.
 * Без JS и при reduced-motion карточки просто стоят на местах.
 */
export function RefSideReveal({ targetId }: { targetId: string }) {
  useEffect(() => {
    const grid = document.getElementById(targetId);
    if (!grid || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let raf = 0;
    const frame = () => {
      raf = 0;
      const vh = window.innerHeight;
      const cols = getComputedStyle(grid).gridTemplateColumns.split(" ").filter(Boolean).length || 1;
      const shift = Math.min(window.innerWidth * 0.28, 360);
      const cards = Array.from(grid.children).filter((el): el is HTMLElement => (el as HTMLElement).offsetParent !== null);
      cards.forEach((card, i) => {
        const top = card.getBoundingClientRect().top;
        const e = easeOut(Math.min(1, Math.max(0, (vh - top) / (vh * 0.55))));
        const col = i % cols;
        const side = cols === 1 ? (i % 2 ? 1 : -1) : col === 0 ? -1 : col === cols - 1 ? 1 : 0;
        const x = side * (1 - e) * shift;
        const y = side === 0 ? (1 - e) * 80 : 0;
        card.style.transform = e >= 1 ? "" : `translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,0)`;
        card.style.opacity = e >= 1 ? "" : String(Math.min(1, 0.05 + e * 1.4).toFixed(3));
      });
    };
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(frame);
    };

    grid.dataset.reveal = "on";
    // Фильтр категорий меняет набор видимых карточек — пересчитать колонки и стороны.
    const mo = new MutationObserver(schedule);
    mo.observe(grid, { attributes: true, attributeFilter: ["data-filter"] });
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    frame();

    return () => {
      cancelAnimationFrame(raf);
      mo.disconnect();
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      delete grid.dataset.reveal;
      Array.from(grid.children).forEach((el) => {
        (el as HTMLElement).style.transform = "";
        (el as HTMLElement).style.opacity = "";
      });
    };
  }, [targetId]);

  return null;
}
