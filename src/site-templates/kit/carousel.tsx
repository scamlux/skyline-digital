"use client";

import { useEffect, useRef, useState } from "react";

const AUTO_MS = 6500;
const EDGE_PX = 6;

/**
 * Карусель со scroll-snap: свайп/колесо работают сами, кнопки «назад/вперёд» и автопрокрутка —
 * поверх. Автопрокрутка стоит на паузе при наведении/фокусе, вне экрана, в фоновой вкладке и
 * при prefers-reduced-motion (тогда только ручное управление).
 */
export function Carousel({
  label,
  prevLabel,
  nextLabel,
  children,
}: {
  label: string;
  prevLabel: string;
  nextLabel: string;
  children: React.ReactNode;
}) {
  const track = useRef<HTMLDivElement>(null);
  const holder = useRef<HTMLDivElement>(null);
  const [edge, setEdge] = useState({ start: true, end: false });
  const paused = useRef(false);

  const measure = () => {
    const el = track.current;
    if (!el) return;
    setEdge({ start: el.scrollLeft <= EDGE_PX, end: el.scrollLeft + el.clientWidth >= el.scrollWidth - EDGE_PX });
  };

  const move = (dir: 1 | -1) => {
    const el = track.current;
    const first = el?.firstElementChild as HTMLElement | null;
    if (!el || !first) return;
    const step = first.getBoundingClientRect().width + 16;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollBy({ left: dir * step, behavior: reduce ? "auto" : "smooth" });
  };

  useEffect(() => {
    const el = track.current;
    const box = holder.current;
    if (!el || !box || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let visible = false;
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
    });
    io.observe(box);
    const id = window.setInterval(() => {
      if (!visible || paused.current || document.hidden) return;
      const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - EDGE_PX;
      if (atEnd) el.scrollTo({ left: 0, behavior: "smooth" });
      else {
        const first = el.firstElementChild as HTMLElement | null;
        if (first) el.scrollBy({ left: first.getBoundingClientRect().width + 16, behavior: "smooth" });
      }
    }, AUTO_MS);
    return () => {
      io.disconnect();
      window.clearInterval(id);
    };
  }, []);

  return (
    <div
      ref={holder}
      className="tpl-carousel"
      onPointerEnter={() => (paused.current = true)}
      onPointerLeave={() => (paused.current = false)}
      onFocus={() => (paused.current = true)}
      onBlur={() => (paused.current = false)}
    >
      <div ref={track} className="tpl-carousel-track" role="region" aria-label={label} tabIndex={0} onScroll={measure}>
        {children}
      </div>
      <div className="tpl-carousel-nav">
        <button type="button" onClick={() => move(-1)} disabled={edge.start} aria-label={prevLabel}>
          <span aria-hidden="true">←</span>
        </button>
        <button type="button" onClick={() => move(1)} disabled={edge.end} aria-label={nextLabel}>
          <span aria-hidden="true">→</span>
        </button>
      </div>
    </div>
  );
}
