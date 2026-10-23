"use client";

import { useEffect, useRef } from "react";

/** Те же условия, что в ref.css для закреплённого режима. */
const PIN_QUERY = "(min-width: 900px) and (hover: hover) and (prefers-reduced-motion: no-preference)";

/**
 * Горизонтальная секция Референса (эталон: `.r-hsec` / `.r-hsticky` / `.r-htrack`).
 *
 * Широкий экран без reduced-motion: секция закрепляется (sticky), вертикальный
 * скролл двигает трек вбок. Высота секции = высота окна + переполнение трека,
 * поэтому скорость одинакова при любом числе карточек.
 * Остальные случаи: нативный горизонтальный свайп со scroll-snap (CSS по умолчанию).
 *
 * Прогресс 0..1 пишется в CSS-переменную `--p` на секции — по ней рисуется
 * линия роадмапа. Карточкам, до которых дошёл прогресс, ставится `data-on`.
 */
export function HorizontalPin({
  id,
  head,
  children,
  trackClassName = "",
  ariaLabel,
  progressBar = false,
}: {
  id: string;
  head: React.ReactNode;
  children: React.ReactNode;
  trackClassName?: string;
  ariaLabel: string;
  /** Полоса прогресса под лентой (эталон: `.r-hbar`). */
  progressBar?: boolean;
}) {
  const secRef = useRef<HTMLElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sec = secRef.current;
    const track = trackRef.current;
    if (!sec || !track) return;

    const mq = window.matchMedia(PIN_QUERY);
    let dist = 0;
    let raf = 0;
    const steps = () => Array.from(track.querySelectorAll<HTMLElement>("[data-step]"));

    const markSteps = (p: number) => {
      const list = steps();
      list.forEach((el, i) => el.setAttribute("data-on", String(p >= i / Math.max(1, list.length - 1) - 0.02)));
    };

    const update = () => {
      raf = 0;
      if (sec.dataset.pin === "on") {
        const top = sec.getBoundingClientRect().top;
        const p = dist > 0 ? Math.min(1, Math.max(0, -top / dist)) : 0;
        track.style.transform = `translate3d(${-p * dist}px,0,0)`;
        sec.style.setProperty("--p", p.toFixed(4));
        markSteps(p);
      } else {
        const max = track.scrollWidth - track.clientWidth;
        const p = max > 0 ? track.scrollLeft / max : 1;
        sec.style.setProperty("--p", p.toFixed(4));
        markSteps(p);
      }
    };
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };

    const layout = () => {
      if (mq.matches) {
        sec.dataset.pin = "on";
        track.style.transform = "";
        // Сколько трек выходит за видимую ширину (паддинги трека учтены в scrollWidth).
        dist = Math.max(0, track.scrollWidth - track.clientWidth);
        sec.style.height = `${window.innerHeight + dist}px`;
      } else {
        sec.dataset.pin = "off";
        sec.style.height = "";
        track.style.transform = "";
        dist = 0;
      }
      update();
    };

    // Клавиатура: фокус на карточке за пределами экрана → прокрутить к ней.
    const onFocus = (e: FocusEvent) => {
      if (sec.dataset.pin !== "on") return;
      const card = (e.target as HTMLElement).closest<HTMLElement>(".r-htrack > *");
      if (!card) return;
      const target = Math.min(dist, Math.max(0, card.offsetLeft - track.offsetLeft - 24));
      const secTop = sec.getBoundingClientRect().top + window.scrollY;
      window.scrollTo({ top: secTop + target, behavior: "auto" });
    };

    const ro = new ResizeObserver(layout);
    ro.observe(track);
    mq.addEventListener("change", layout);
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", layout);
    track.addEventListener("scroll", schedule, { passive: true });
    track.addEventListener("focusin", onFocus);
    layout();

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      mq.removeEventListener("change", layout);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", layout);
      track.removeEventListener("scroll", schedule);
      track.removeEventListener("focusin", onFocus);
    };
  }, []);

  return (
    <section ref={secRef} id={id} className="r-hsec" data-pin="off" aria-label={ariaLabel}>
      <div className="r-hsticky">
        {head}
        <div ref={trackRef} className={`r-htrack ${trackClassName}`.trim()}>
          {children}
        </div>
        {progressBar && (
          <div className="r-hbar" aria-hidden="true">
            <span />
          </div>
        )}
      </div>
    </section>
  );
}
