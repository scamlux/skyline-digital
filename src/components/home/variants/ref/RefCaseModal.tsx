"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "@/i18n/navigation";
import { useDialog } from "@/components/site/chrome/ref/useDialog";

export type RefCase = {
  slug: string;
  title: string;
  cat: string;
  desc: string;
  tags: string[];
  image: string;
  url?: string;
};

const TRANSITION =
  "transform .72s cubic-bezier(.76,0,.24,1), border-radius .72s cubic-bezier(.76,0,.24,1), filter .6s ease";
const CLOSE_MS = 740;

/**
 * Кейс с depth-открытием (эталон: `#rCase`). Карточки проектов — обычные ссылки
 * на /projects/[slug] с `data-case`; здесь клик перехватывается, и обложка
 * «вырастает» из прямоугольника карточки на весь экран (FLIP: старт —
 * translate(left,top) scale(w/W, h/H) от точки 0 0, финиш — scale(1)).
 * Ctrl/⌘-клик и средняя кнопка открывают страницу проекта как обычно.
 *
 * Рендерится порталом в обёртку `[data-site="ref"]`: внутри <main> (z-index 2)
 * и тем более внутри сдвинутого transform-ом трека `position: fixed` не работает.
 */
export function RefCaseModal({
  cases,
  labels,
}: {
  cases: RefCase[];
  labels: { close: string; openSite: string; caseMore: string };
}) {
  const [current, setCurrent] = useState<RefCase | null>(null);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const mediaRef = useRef<HTMLDivElement>(null);
  const startRef = useRef("translate(0px,0px) scale(.62)");
  const closeTimer = useRef(0);
  const reduce = useRef(false);

  const close = useCallback(() => {
    setOpen(false);
    const media = mediaRef.current;
    if (media && !reduce.current) {
      media.style.transition = TRANSITION;
      media.style.transform = startRef.current;
      media.style.borderRadius = "12px";
      media.style.filter = "blur(4px)";
    }
    window.clearTimeout(closeTimer.current);
    closeTimer.current = window.setTimeout(() => setCurrent(null), reduce.current ? 0 : CLOSE_MS);
  }, []);

  useDialog(current !== null, rootRef, close);

  // Перехват кликов по карточкам: делегирование, чтобы карточки оставались серверными.
  // Фаза захвата — раньше обработчика <Link> (он на корне React); Link не навигирует,
  // если событие уже defaultPrevented.
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const card = (e.target as Element).closest?.<HTMLElement>("[data-case]");
      const c = card && cases.find((x) => x.slug === card.dataset.case);
      if (!card || !c) return;
      e.preventDefault();
      window.clearTimeout(closeTimer.current);
      reduce.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const r = (card.querySelector(".r-pcimg") ?? card).getBoundingClientRect();
      const sx = Math.max(0.05, r.width / window.innerWidth);
      const sy = Math.max(0.02, r.height / window.innerHeight);
      startRef.current = `translate(${r.left.toFixed(1)}px,${r.top.toFixed(1)}px) scale(${sx.toFixed(4)},${sy.toFixed(4)})`;
      setCurrent(c);
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [cases]);

  // Кадр 1: обложка встаёт на место карточки без анимации. Кадр 2: анимация на весь экран.
  useEffect(() => {
    const media = mediaRef.current;
    if (!current || !media) return;
    if (reduce.current) {
      media.style.transition = "none";
      media.style.transform = "none";
      media.style.borderRadius = "0";
      media.style.filter = "none";
      media.style.opacity = "1";
      setOpen(true);
      return;
    }
    media.style.transition = "none";
    media.style.transformOrigin = "0 0";
    media.style.transform = startRef.current;
    media.style.borderRadius = "10px";
    media.style.filter = "blur(3px)";
    media.style.opacity = "1";
    void media.offsetWidth;
    const raf = requestAnimationFrame(() => {
      setOpen(true);
      media.style.transition = TRANSITION;
      media.style.transform = "translate(0px,0px) scale(1,1)";
      media.style.borderRadius = "0px";
      media.style.filter = "blur(0px)";
    });
    return () => cancelAnimationFrame(raf);
  }, [current]);

  useEffect(() => () => window.clearTimeout(closeTimer.current), []);

  // current выставляется только кликом — на сервере и при гидрации здесь всегда null.
  const host = current && document.querySelector<HTMLElement>('[data-site="ref"]');
  if (!host || !current) return null;

  return createPortal(
    <div
      ref={rootRef}
      className={open ? "r-case open" : "r-case"}
      role="dialog"
      aria-modal="true"
      aria-labelledby="r-case-title"
      tabIndex={-1}
    >
      <div ref={mediaRef} className="rc-media">
        <Image src={current.image} alt="" fill sizes="100vw" priority />
      </div>
      <div className="rc-dim" aria-hidden="true" />
      <button type="button" className="rc-close" onClick={close}>
        {labels.close} <span aria-hidden="true">✕</span>
      </button>
      <div className="rc-body">
        <div className="rc-cat">{current.cat}</div>
        <h2 id="r-case-title" className="rc-title">
          {current.title}
        </h2>
        <p className="rc-desc">{current.desc}</p>
        {current.tags.length > 0 && (
          <div className="rc-tags">
            {current.tags.map((t) => (
              <span key={t}>{t}</span>
            ))}
          </div>
        )}
        <div className="r-hcta">
          {current.url && (
            <a href={current.url} target="_blank" rel="noopener noreferrer" className="r-cta">
              {labels.openSite} <span aria-hidden="true">↗</span>
            </a>
          )}
          <Link href={`/projects/${current.slug}`} className="r-cta ghost" onClick={close}>
            {labels.caseMore} <span aria-hidden="true">→</span>
          </Link>
        </div>
      </div>
    </div>,
    host,
  );
}
