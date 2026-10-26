"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Частицы в hero Studio (эталон: canvas `#fx`): светлые точки медленно всплывают
 * и слегка смещаются за курсором. Reduced-motion — статичный кадр.
 * Пауза, когда вкладка скрыта или hero ушёл с экрана.
 */
export function StudioParticles() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const cv = ref.current;
    const ctx = cv?.getContext("2d");
    if (!cv || !ctx) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let W = 0;
    let H = 0;
    let raf = 0;
    let mx = 0.5;
    let visible = true;
    type P = { x: number; y: number; r: number; v: number; o: number; ph: number };
    let pts: P[] = [];

    const init = () => {
      const r = cv.getBoundingClientRect();
      W = r.width;
      H = r.height;
      cv.width = W * dpr;
      cv.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const n = Math.max(26, Math.min(64, Math.floor(W / 26)));
      pts = Array.from({ length: n }, () => ({
        x: Math.random() * W,
        y: Math.random() * H,
        r: 0.6 + Math.random() * 1.8,
        v: 0.1 + Math.random() * 0.35,
        o: 0.2 + Math.random() * 0.6,
        ph: Math.random() * 6.28,
      }));
    };
    const dot = (p: P, o: number) => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, 6.283);
      ctx.fillStyle = `rgba(190,210,255,${o})`;
      ctx.fill();
    };
    const draw = () => {
      raf = 0;
      ctx.clearRect(0, 0, W, H);
      for (const p of pts) {
        p.y -= p.v;
        p.ph += 0.01;
        p.x += Math.sin(p.ph) * 0.12 + (mx - 0.5) * 0.18;
        if (p.y < -4) {
          p.y = H + 4;
          p.x = Math.random() * W;
        }
        dot(p, p.o * (0.6 + 0.4 * Math.sin(p.ph * 2)));
      }
      if (visible && !document.hidden) raf = requestAnimationFrame(draw);
    };
    const still = () => {
      ctx.clearRect(0, 0, W, H);
      for (const p of pts) dot(p, p.o);
    };
    const start = () => {
      if (!reduce && !raf && visible && !document.hidden) raf = requestAnimationFrame(draw);
    };

    init();
    if (reduce) still();
    else start();

    const hero = cv.closest<HTMLElement>(".hero");
    const onMove = (e: PointerEvent) => {
      const r = cv.getBoundingClientRect();
      mx = (e.clientX - r.left) / r.width;
    };
    const onResize = () => {
      init();
      if (reduce) still();
    };
    const onVis = () => start();
    const io = new IntersectionObserver(([en]) => {
      visible = en.isIntersecting;
      start();
    });
    if (hero) io.observe(hero);
    hero?.addEventListener("pointermove", onMove);
    window.addEventListener("resize", onResize);
    document.addEventListener("visibilitychange", onVis);

    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      hero?.removeEventListener("pointermove", onMove);
      window.removeEventListener("resize", onResize);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  return <canvas ref={ref} id="fx" aria-hidden="true" />;
}

/**
 * Сменяющееся слово в заголовке (эталон: `#rot`), раз в 2.6 с.
 * Все слова лежат в одной ячейке грида друг на друге: ширина строки — по самому
 * длинному слову с первого кадра, поэтому смена не сдвигает заголовок. Переход —
 * перекрёстное затухание с лёгким подъёмом и размытием (CSS `.rot-w`).
 * В HTML активно первое слово; reduced-motion — без смены. Для скринридеров
 * заголовок целиком дан отдельной строкой, сам ротатор скрыт.
 */
export function StudioRotator({ words }: { words: string[] }) {
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (words.length < 2 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setInterval(() => {
      // Во фоновой вкладке не крутим — при возврате нет «пачки» переходов.
      if (!document.hidden) setActive((i) => (i + 1) % words.length);
    }, 2600);
    return () => window.clearInterval(timer);
  }, [words]);

  return (
    <span className="rot" aria-hidden="true">
      {words.map((w, i) => (
        <span key={w} className={i === active ? "rot-w on" : "rot-w"}>
          {w}
        </span>
      ))}
    </span>
  );
}

/** Стрелки карусели проектов (эталон: `.caronav`): шаг — ширина карточки, неактивны на краях. */
export function StudioCaroNav({ trackId, labels }: { trackId: string; labels: { prev: string; next: string; hint: string } }) {
  const prevRef = useRef<HTMLButtonElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const track = document.getElementById(trackId);
    if (!track) return;
    const upd = () => {
      if (prevRef.current) prevRef.current.disabled = track.scrollLeft <= 4;
      if (nextRef.current) nextRef.current.disabled = track.scrollLeft + track.clientWidth >= track.scrollWidth - 4;
    };
    let raf = 0;
    const onScroll = () => {
      if (!raf)
        raf = requestAnimationFrame(() => {
          raf = 0;
          upd();
        });
    };
    track.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", upd);
    upd();
    return () => {
      cancelAnimationFrame(raf);
      track.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", upd);
    };
  }, [trackId]);

  const go = (dir: 1 | -1) => {
    const track = document.getElementById(trackId);
    const card = track?.querySelector(".pcard");
    if (!track) return;
    const step = card ? card.getBoundingClientRect().width + 20 : 320;
    const smooth = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    track.scrollBy({ left: dir * step, behavior: smooth ? "smooth" : "instant" });
  };

  return (
    <div className="caronav">
      <button ref={prevRef} className="caroarrow" type="button" aria-label={labels.prev} onClick={() => go(-1)} disabled>
        ←
      </button>
      <button ref={nextRef} className="caroarrow" type="button" aria-label={labels.next} onClick={() => go(1)}>
        →
      </button>
      <span className="carohint">{labels.hint}</span>
    </div>
  );
}
