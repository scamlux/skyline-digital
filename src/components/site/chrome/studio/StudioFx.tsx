"use client";

import { useEffect, useRef } from "react";

const fmt = (n: number) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, " ");

/**
 * Поведение страниц Studio без своей разметки (эталон: общий скрипт #ver-studio):
 * появление `.rv`/`.srow` при прокрутке (строки услуг — лесенкой), счётчики
 * `[data-count]`, параллакс hero (`[data-depth]`, `#s-hero-content`) и прогресс
 * линии процесса (`#s-proc`). Пока JS не запустился, всё видно (CSS ждёт `data-js`).
 */
export function StudioFx() {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const site = ref.current?.closest<HTMLElement>('[data-site="studio"]');
    if (!site) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    site.dataset.js = "";

    // ——— появление ———
    const io = new IntersectionObserver(
      (entries) => {
        for (const en of entries) {
          if (!en.isIntersecting) continue;
          const el = en.target as HTMLElement;
          if (el.classList.contains("srow") && el.parentElement) {
            el.style.transitionDelay = `${Array.from(el.parentElement.children).indexOf(el) * 0.06}s`;
            // Задержка нужна только для появления — иначе отступ при наведении отстаёт.
            el.addEventListener("transitionend", () => (el.style.transitionDelay = ""), { once: true });
          }
          el.classList.add("in");
          io.unobserve(el);
        }
      },
      { threshold: 0.14 },
    );
    site.querySelectorAll(".rv, .srow").forEach((el) => io.observe(el));

    // ——— счётчики ———
    const rafs = new Set<number>();
    const countUp = (el: HTMLElement) => {
      const target = parseFloat(el.dataset.count ?? "0");
      const pre = el.dataset.prefix ?? "";
      const suf = el.dataset.suffix ?? "";
      if (reduce) return;
      let t0 = 0;
      const step = (ts: number) => {
        if (!t0) t0 = ts;
        const p = Math.min((ts - t0) / 1100, 1);
        el.textContent = pre + fmt(target * (1 - Math.pow(1 - p, 3))) + suf;
        if (p < 1) rafs.add(requestAnimationFrame(step));
      };
      rafs.add(requestAnimationFrame(step));
    };
    const cio = new IntersectionObserver(
      (entries) => {
        for (const en of entries) {
          if (!en.isIntersecting) continue;
          countUp(en.target as HTMLElement);
          cio.unobserve(en.target);
        }
      },
      { threshold: 0.5 },
    );
    site.querySelectorAll<HTMLElement>("[data-count]").forEach((el) => cio.observe(el));

    // ——— параллакс hero и линия процесса ———
    const layers = Array.from(site.querySelectorAll<HTMLElement>("[data-depth]"));
    const heroContent = site.querySelector<HTMLElement>("#s-hero-content");
    const proc = site.querySelector<HTMLElement>("#s-proc");
    const railFill = proc?.querySelector<HTMLElement>(".rail-fill");
    const steps = proc ? Array.from(proc.querySelectorAll<HTMLElement>(".pstep")) : [];
    let ticking = 0;
    const onScroll = () => {
      ticking = 0;
      const y = window.scrollY;
      const vh = window.innerHeight;
      if (!reduce) {
        for (const l of layers) l.style.transform = `translate3d(0,${y * parseFloat(l.dataset.depth ?? "0")}px,0)`;
        if (heroContent && y < vh) {
          heroContent.style.transform = `translate3d(0,${y * 0.28}px,0)`;
          heroContent.style.opacity = String(Math.max(0, 1 - y / (vh * 0.72)));
        }
      }
      if (proc && steps.length) {
        const r = proc.getBoundingClientRect();
        const prog = Math.max(0, Math.min(1, (vh * 0.5 - r.top + vh * 0.1) / (r.height + vh * 0.2)));
        if (railFill) railFill.style.height = `${prog * 100}%`;
        const active = Math.min(steps.length - 1, Math.floor(prog * steps.length + 0.001));
        steps.forEach((s, i) => s.classList.toggle("on", i <= active));
      }
    };
    const schedule = () => {
      if (!ticking) ticking = requestAnimationFrame(onScroll);
    };
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    onScroll();

    return () => {
      io.disconnect();
      cio.disconnect();
      rafs.forEach(cancelAnimationFrame);
      cancelAnimationFrame(ticking);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      delete site.dataset.js;
    };
  }, []);

  return <span ref={ref} hidden />;
}
