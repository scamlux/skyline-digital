"use client";

import { useEffect, useRef } from "react";

/**
 * Слой движения для шаблона: ОДИН остров на страницу, который работает по data-атрибутам
 * серверной разметки. Никакого React-компонента на каждый анимируемый элемент — JS остаётся
 * маленьким, а гидрация дешёвой.
 *
 *  data-reveal      появление секции при прокрутке (opacity/transform); --d — шаг задержки
 *  data-count       счётчик «до N»; финальное число уже в разметке (SSR), анимация лишь добавка
 *  data-pointer     контейнер, по курсору задаёт --px/--py (−1…1) и --mx/--my (px) — параллакс и свет
 *  data-tilt        карточка с наклоном за курсором (--rx/--ry)
 *  data-pausable    анимации ставятся на паузу, когда блок вне экрана (data-off)
 *
 * Правила: ничего не стартует до первой отрисовки (атрибут data-live ставится после двух
 * кадров), вкладка в фоне — пауза (data-paused), prefers-reduced-motion — слой не включается
 * вовсе и страница остаётся статичной. Контент выше линии сгиба никогда не прячется:
 * скрываются только блоки, которые на момент монтирования ниже экрана.
 */
const REVEAL_SKIP_ABOVE = 0.9;
const COUNT_MS = 1400;
const TILT_DEG = 7;

const group = (n: number, sep: string) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, sep);
const NBSP = " ";

function formatCount(value: number, decimals: number, decimalSep: string): string {
  const fixed = value.toFixed(decimals);
  const [int, frac] = fixed.split(".");
  return frac ? `${group(Number(int), NBSP)}${decimalSep}${frac}` : group(Number(int), NBSP);
}

export function MotionLayer() {
  const sentinel = useRef<HTMLElement>(null);

  useEffect(() => {
    const root = sentinel.current?.closest<HTMLElement>("[data-tpl]");
    if (!root || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const cleanups: Array<() => void> = [];

    // 1. Появление секций: прячем только то, что ниже экрана, и показываем при подходе.
    const vh = window.innerHeight;
    const below = Array.from(root.querySelectorAll<HTMLElement>("[data-reveal]")).filter(
      (el) => el.getBoundingClientRect().top > vh * REVEAL_SKIP_ABOVE,
    );
    below.forEach((el) => el.classList.add("rv"));
    const revealIo = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          e.target.classList.add("rv-in");
          revealIo.unobserve(e.target);
        }
      },
      { rootMargin: "0px 0px -6% 0px", threshold: 0.06 },
    );
    below.forEach((el) => revealIo.observe(el));
    cleanups.push(() => revealIo.disconnect());

    // 2. Счётчики: запускаются, когда блок виден; на выходе — тот же текст, что был в разметке.
    const counters = Array.from(root.querySelectorAll<HTMLElement>("[data-count]"));
    let rafId = 0;
    const countIo = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          countIo.unobserve(e.target);
          runCount(e.target as HTMLElement);
        }
      },
      { threshold: 0.4 },
    );
    function runCount(el: HTMLElement) {
      const target = Number(el.dataset.count);
      const decimals = Number(el.dataset.dec ?? 0);
      const decSep = el.dataset.decSep ?? ".";
      const finalText = el.textContent ?? "";
      const plus = finalText.endsWith("+") ? "+" : "";
      const start = performance.now();
      const step = (now: number) => {
        const p = Math.min(1, (now - start) / COUNT_MS);
        const eased = 1 - Math.pow(1 - p, 3);
        el.textContent = p >= 1 ? finalText : `${formatCount(target * eased, decimals, decSep)}${plus}`;
        if (p < 1) rafId = requestAnimationFrame(step);
      };
      rafId = requestAnimationFrame(step);
    }
    counters.forEach((el) => countIo.observe(el));
    cleanups.push(() => {
      countIo.disconnect();
      cancelAnimationFrame(rafId);
    });

    // 3. Анимации CSS ставим на паузу вне экрана и в фоновой вкладке.
    const pauseIo = new IntersectionObserver((entries) => {
      for (const e of entries) (e.target as HTMLElement).dataset.off = e.isIntersecting ? "0" : "1";
    });
    root.querySelectorAll<HTMLElement>("[data-pausable]").forEach((el) => pauseIo.observe(el));
    cleanups.push(() => pauseIo.disconnect());
    const syncVisibility = () => {
      root.dataset.paused = document.hidden ? "1" : "0";
    };
    syncVisibility();
    document.addEventListener("visibilitychange", syncVisibility);
    cleanups.push(() => document.removeEventListener("visibilitychange", syncVisibility));

    // 4. Курсор: параллакс/свет в hero и наклон карточек — одним делегированным обработчиком.
    if (window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
      let frame = 0;
      let lastTilt: HTMLElement | null = null;
      const clearTilt = () => {
        lastTilt?.style.removeProperty("--rx");
        lastTilt?.style.removeProperty("--ry");
        lastTilt = null;
      };
      const onMove = (ev: PointerEvent) => {
        if (ev.pointerType !== "mouse") return;
        const { clientX, clientY } = ev;
        const target = ev.target as Element;
        cancelAnimationFrame(frame);
        frame = requestAnimationFrame(() => {
          const zone = target.closest<HTMLElement>("[data-pointer]");
          if (zone) {
            const r = zone.getBoundingClientRect();
            const x = (clientX - r.left) / r.width;
            const y = (clientY - r.top) / r.height;
            zone.style.setProperty("--px", (x * 2 - 1).toFixed(3));
            zone.style.setProperty("--py", (y * 2 - 1).toFixed(3));
            zone.style.setProperty("--mx", `${Math.round(clientX - r.left)}px`);
            zone.style.setProperty("--my", `${Math.round(clientY - r.top)}px`);
          }
          const card = target.closest<HTMLElement>("[data-tilt]");
          if (card !== lastTilt) clearTilt();
          if (card) {
            const r = card.getBoundingClientRect();
            const x = (clientX - r.left) / r.width - 0.5;
            const y = (clientY - r.top) / r.height - 0.5;
            card.style.setProperty("--rx", `${(-y * TILT_DEG).toFixed(2)}deg`);
            card.style.setProperty("--ry", `${(x * TILT_DEG).toFixed(2)}deg`);
            lastTilt = card;
          }
        });
      };
      const onLeave = () => {
        cancelAnimationFrame(frame);
        clearTilt();
        root.querySelectorAll<HTMLElement>("[data-pointer]").forEach((z) => {
          z.style.setProperty("--px", "0");
          z.style.setProperty("--py", "0");
        });
      };
      root.addEventListener("pointermove", onMove, { passive: true });
      root.addEventListener("pointerleave", onLeave);
      cleanups.push(() => {
        cancelAnimationFrame(frame);
        root.removeEventListener("pointermove", onMove);
        root.removeEventListener("pointerleave", onLeave);
      });
    }

    // 5. Живые анимации включаем после первой отрисовки (два кадра), а не вместе с гидрацией.
    let live1 = 0;
    let live2 = 0;
    live1 = requestAnimationFrame(() => {
      live2 = requestAnimationFrame(() => {
        root.dataset.live = "1";
      });
    });
    cleanups.push(() => {
      cancelAnimationFrame(live1);
      cancelAnimationFrame(live2);
      delete root.dataset.live;
    });

    return () => cleanups.forEach((fn) => fn());
  }, []);

  return <i ref={sentinel} hidden aria-hidden="true" />;
}
