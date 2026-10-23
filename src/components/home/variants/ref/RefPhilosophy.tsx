"use client";

import { useEffect, useRef } from "react";

const ease = (p: number) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);

/**
 * «Философия» (эталон: `#r-phil`): секция 230vh с липким кадром. По скроллу
 * картинка разворачивается из карточки (scale .64→1, радиус 32→0, blur 16→0),
 * крупное слово гаснет и растёт, затем проявляется текст.
 * При reduced-motion скрипт не запускается — статичное состояние задаёт CSS.
 */
export function RefPhilosophy({ big, pill, children }: { big: string; pill: string; children: React.ReactNode }) {
  const secRef = useRef<HTMLElement>(null);
  const mediaRef = useRef<HTMLDivElement>(null);
  const dimRef = useRef<HTMLDivElement>(null);
  const bigRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sec = secRef.current;
    if (!sec || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0;
    const frame = () => {
      raf = 0;
      const r = sec.getBoundingClientRect();
      const p = Math.max(0, Math.min(1, -r.top / (r.height - window.innerHeight || 1)));
      const pe = ease(p);
      const media = mediaRef.current;
      if (media) {
        media.style.transform = `scale(${(0.64 + 0.36 * pe).toFixed(4)})`;
        media.style.borderRadius = `${(32 * (1 - pe)).toFixed(2)}px`;
        media.style.filter = `blur(${(16 * (1 - pe)).toFixed(2)}px)`;
      }
      if (dimRef.current) dimRef.current.style.opacity = (1 - 0.42 * pe).toFixed(3);
      if (bigRef.current) {
        bigRef.current.style.opacity = (1 - Math.min(1, pe / 0.42)).toFixed(3);
        bigRef.current.style.transform = `scale(${(1 + 0.28 * pe).toFixed(3)})`;
      }
      if (textRef.current) {
        const to = Math.max(0, Math.min(1, (pe - 0.56) / 0.4));
        textRef.current.style.opacity = to.toFixed(3);
        textRef.current.style.transform = `translateY(${(18 * (1 - to)).toFixed(1)}px)`;
      }
    };
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(frame);
    };
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    frame();
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, []);

  return (
    <section ref={secRef} className="r-phil" aria-label={pill}>
      <div className="r-phil-sticky">
        <div ref={mediaRef} className="r-phil-media" aria-hidden="true" />
        <div ref={dimRef} className="r-phil-dim" aria-hidden="true" />
        <div ref={bigRef} className="r-phil-big" aria-hidden="true">
          {big}
        </div>
        <div ref={textRef} className="r-phil-text">
          <span className="pill">{pill}</span>
          {children}
        </div>
      </div>
    </section>
  );
}
