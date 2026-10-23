"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { lockScroll } from "./scrollLock";

const SEEN_KEY = "r-pre-seen";
const DURATION = 1750;
const FINAL = "SKYLINE";

/**
 * Прелоадер вариантов Studio и Референс (эталон: `#preload`): слова-услуги с глитчем, проценты,
 * полоса снизу, «Пропустить». Показывается один раз за сессию вкладки.
 *
 * Слой приходит в HTML сразу (иначе контент мигнул бы до гидрации), а инлайн-скрипт
 * прячет его до первой отрисовки, если в этой сессии прелоадер уже был.
 * Без JS слой скрыт через <noscript>.
 */
export function Preloader({ words, labels }: { words: string[]; labels: { skip: string; loading: string } }) {
  const [phase, setPhase] = useState<"run" | "done" | "gone">("run");
  const [glitch, setGlitch] = useState(true);
  const rootRef = useRef<HTMLDivElement>(null);
  const wordRef = useRef<HTMLSpanElement>(null);
  const pctRef = useRef<HTMLSpanElement>(null);
  const barRef = useRef<HTMLSpanElement>(null);

  // Layout-эффект: при клиентском переходе на страницу Референса слой не должен мигнуть.
  useLayoutEffect(() => {
    let seen = false;
    try {
      seen = sessionStorage.getItem(SEEN_KEY) === "1";
    } catch {}
    if (seen) {
      if (rootRef.current) rootRef.current.style.display = "none";
      return;
    }

    const setWord = (w: string) => {
      const el = wordRef.current;
      if (el && el.textContent !== w) {
        el.textContent = w;
        el.setAttribute("data-t", w);
      }
    };
    const setPct = (pct: number) => {
      if (pctRef.current) pctRef.current.textContent = String(pct);
      if (barRef.current) barRef.current.style.width = `${pct}%`;
    };

    const unlock = lockScroll();
    let finished = false;
    let raf = 0;
    const timers: number[] = [];
    const finish = () => {
      if (finished) return;
      finished = true;
      cancelAnimationFrame(raf);
      // Флаг ставим по завершении (а не на старте): двойной эффект StrictMode в dev не прячет слой.
      try {
        sessionStorage.setItem(SEEN_KEY, "1");
      } catch {}
      unlock();
      document.removeEventListener("keydown", onKey);
      setPhase("done");
      timers.push(window.setTimeout(() => setPhase("gone"), 700));
    };

    // Пока слой на экране, Tab не уходит под него (там шапка и карточки), Esc — пропустить.
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") finish();
      if (e.key !== "Tab") return;
      e.preventDefault();
      rootRef.current?.querySelector<HTMLElement>(".pskip")?.focus();
    };
    document.addEventListener("keydown", onKey);

    const root = rootRef.current;
    root?.addEventListener("click", finish);

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      // Глитч при reduced-motion выключен в CSS.
      setPct(100);
      setWord(FINAL);
      timers.push(window.setTimeout(finish, 280));
    } else {
      let t0 = 0;
      const tick = (ts: number) => {
        if (!t0) t0 = ts;
        const p = Math.min((ts - t0) / DURATION, 1);
        setPct(Math.round(p * 100));
        setWord(words[Math.min(words.length - 1, Math.floor(p * words.length))] ?? FINAL);
        if (p < 1) {
          if (!finished) raf = requestAnimationFrame(tick);
        } else {
          setWord(FINAL);
          setGlitch(false);
          timers.push(window.setTimeout(finish, 340));
        }
      };
      raf = requestAnimationFrame(tick);
    }

    return () => {
      cancelAnimationFrame(raf);
      timers.forEach(clearTimeout);
      root?.removeEventListener("click", finish);
      document.removeEventListener("keydown", onKey);
      unlock();
    };
  }, [words]);

  if (phase === "gone") return null;

  const first = words[0] ?? FINAL;
  return (
    <>
      <noscript>
        <style>{`[data-site="ref"] .r-pre{display:none}`}</style>
      </noscript>
      <div
        ref={rootRef}
        className={`r-pre${glitch ? " gl" : ""}${phase === "done" ? " done" : ""}`}
        role="status"
        aria-label={labels.loading}
        suppressHydrationWarning
      >
        <span ref={wordRef} className="pword" data-t={first} aria-hidden="true">
          {first}
        </span>
        <span className="ppct" aria-hidden="true">
          <span ref={pctRef}>0</span>
        </span>
        {/* Клик всплывает до слоя — его обработчик и завершает прелоадер. */}
        <button type="button" className="pskip">
          {labels.skip}
        </button>
        <span ref={barRef} className="pbar" aria-hidden="true" />
      </div>
      {/* До гидрации: в этой сессии уже показывали — спрятать слой до первой отрисовки. */}
      <script
        dangerouslySetInnerHTML={{
          __html: `try{if(sessionStorage.getItem("${SEEN_KEY}")==="1"){var e=document.currentScript.previousElementSibling;e&&(e.style.display="none")}}catch(e){}`,
        }}
      />
    </>
  );
}
