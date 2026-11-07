"use client";

import { useEffect, useRef, useState } from "react";
import { formatSum, pick } from "../types";
import { useOverrides } from "./client-bits";
import { useSalon } from "./context";
import { bookingDraft, goToBooking } from "./draft-store";
import { fill, formatMinutes } from "./format";
import { basketOf } from "./schedule";
import { demo } from "./store";
import { salonUi as ui } from "./ui";

const IMG = "/templates/salon/img";
const DRAG_THRESHOLD_PX = 5;

/**
 * Живой лукбук: горизонтальная лента с scroll-snap (свайп, колесо, стрелки, перетаскивание мышью),
 * зум фото при наведении, по клику — лайтбокс на нативном <dialog>: Esc закрывает, фокус заперт
 * внутри, при закрытии возвращается на карточку. «Хочу так же» подставляет услуги и мастера в запись.
 */
export function Lookbook() {
  const { looks, locale } = useSalon();
  const track = useRef<HTMLUListElement>(null);
  const drag = useRef({ down: false, x: 0, left: 0, moved: false });
  const [open, setOpen] = useState<number | null>(null);
  const [edge, setEdge] = useState({ start: true, end: false });

  const measure = () => {
    const el = track.current;
    if (el) setEdge({ start: el.scrollLeft <= 6, end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 6 });
  };
  const move = (dir: 1 | -1) => {
    const el = track.current;
    const first = el?.firstElementChild as HTMLElement | null;
    if (!el || !first) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollBy({ left: dir * (first.getBoundingClientRect().width + 16) * 2, behavior: reduce ? "auto" : "smooth" });
  };

  function onPointerDown(e: React.PointerEvent<HTMLUListElement>) {
    if (e.pointerType !== "mouse" || e.button !== 0 || !track.current) return;
    drag.current = { down: true, x: e.clientX, left: track.current.scrollLeft, moved: false };
  }
  function onPointerMove(e: React.PointerEvent<HTMLUListElement>) {
    const d = drag.current;
    const el = track.current;
    if (!d.down || !el) return;
    const dx = e.clientX - d.x;
    if (!d.moved && Math.abs(dx) > DRAG_THRESHOLD_PX) {
      d.moved = true;
      el.setPointerCapture(e.pointerId);
      el.dataset.dragging = "1";
    }
    if (d.moved) el.scrollLeft = d.left - dx;
  }
  function endDrag() {
    drag.current.down = false;
    if (track.current) delete track.current.dataset.dragging;
    // moved сбрасывается после клика, который браузер пошлёт сразу за отпусканием.
    window.setTimeout(() => (drag.current.moved = false), 0);
  }

  function show(i: number) {
    demo.track("look");
    setOpen(i);
  }

  return (
    <div className="sl-look" data-lookbook>
      <ul
        ref={track}
        className="sl-look-track"
        aria-label={pick(ui.looks.label, locale)}
        onScroll={measure}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onClickCapture={(e) => {
          if (drag.current.moved) {
            e.preventDefault();
            e.stopPropagation();
          }
        }}
      >
        {looks.map((l, i) => (
          <li key={l.id} className="sl-look-item">
            <button type="button" onClick={() => show(i)} aria-label={`${pick(ui.looks.open, locale)}: ${l.title}`} draggable={false}>
              {/* eslint-disable-next-line @next/next/no-img-element -- шаблон переносимый: без next/image */}
              <img
                src={`${IMG}/${l.photo}-480.webp`}
                srcSet={`${IMG}/${l.photo}-240.webp 240w, ${IMG}/${l.photo}-480.webp 480w, ${IMG}/${l.photo}-960.webp 960w`}
                sizes="(max-width: 860px) 62vw, 320px"
                width={960}
                height={1200}
                alt={l.alt}
                loading="lazy"
                decoding="async"
                draggable={false}
              />
              <span className="sl-look-cap">
                <small>{l.tag}</small>
                <b>{l.title}</b>
              </span>
              <i className="sl-look-plus" aria-hidden="true" />
            </button>
          </li>
        ))}
      </ul>
      <div className="sl-look-nav">
        <button type="button" onClick={() => move(-1)} disabled={edge.start} aria-label={pick(ui.looks.prev, locale)}>
          <span aria-hidden="true">←</span>
        </button>
        <button type="button" onClick={() => move(1)} disabled={edge.end} aria-label={pick(ui.looks.next, locale)}>
          <span aria-hidden="true">→</span>
        </button>
      </div>
      <LookDialog index={open} onIndex={setOpen} />
    </div>
  );
}

function LookDialog({ index, onIndex }: { index: number | null; onIndex: (i: number | null) => void }) {
  const { looks, masters, services, sched, locale } = useSalon();
  const ov = useOverrides();
  const ref = useRef<HTMLDialogElement>(null);

  // Нативный <dialog>: showModal даёт фокус-ловушку, Esc и инертный фон.
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (index !== null && !d.open) d.showModal();
    if (index === null && d.open) d.close();
  }, [index]);

  const look = index === null ? null : looks[index];
  const basket = look ? basketOf(sched, ov, look.serviceIds) : null;
  const names = basket ? basket.ids.map((id) => services.find((s) => s.id === id)?.name ?? id) : [];
  const master = look ? masters.find((m) => m.id === look.masterId) : null;

  function step(dir: 1 | -1) {
    if (index === null) return;
    demo.track("look");
    onIndex((index + dir + looks.length) % looks.length);
  }

  return (
    <dialog
      ref={ref}
      className="sl-dialog"
      aria-label={look?.title ?? pick(ui.looks.label, locale)}
      onClose={() => onIndex(null)}
      onClick={(e) => {
        if (e.target === ref.current) onIndex(null);
      }}
      onKeyDown={(e) => {
        if (e.key === "ArrowRight") step(1);
        if (e.key === "ArrowLeft") step(-1);
      }}
    >
      {look && basket && (
        <div className="sl-dialog-box">
          <button type="button" className="sl-dialog-close" onClick={() => onIndex(null)} aria-label={pick(ui.looks.close, locale)}>
            <span aria-hidden="true">×</span>
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element -- шаблон переносимый: без next/image */}
          <img src={`${IMG}/${look.photo}-960.webp`} srcSet={`${IMG}/${look.photo}-480.webp 480w, ${IMG}/${look.photo}-960.webp 960w`} sizes="(max-width: 860px) 90vw, 440px" width={960} height={1200} alt={look.alt} decoding="async" />
          <div className="sl-dialog-info">
            <p className="sl-dialog-count" aria-live="polite">
              {fill(pick(ui.looks.counter, locale), { n: (index ?? 0) + 1, total: looks.length })}
            </p>
            <small className="sl-dialog-tag">{look.tag}</small>
            <h3>{look.title}</h3>
            <p className="sl-dialog-svc">{names.join(" + ")}</p>
            <p className="sl-dialog-meta">
              <b>{formatSum(basket.price, locale)}</b> · {formatMinutes(basket.minutes, locale)}
            </p>
            {master && (
              <p className="sl-dialog-master">
                {pick(ui.looks.master, locale)}: <b>{master.name}</b>
              </p>
            )}
            <button
              type="button"
              className="sl-btn"
              onClick={() => {
                bookingDraft.send({ serviceIds: basket.ids, masterId: look.masterId, lookId: look.id });
                onIndex(null);
                goToBooking();
              }}
              disabled={basket.ids.length === 0}
            >
              {pick(ui.looks.wantSame, locale)}
            </button>
            <div className="sl-dialog-nav">
              <button type="button" onClick={() => step(-1)} aria-label={pick(ui.looks.lightboxPrev, locale)}>
                <span aria-hidden="true">←</span>
              </button>
              <button type="button" onClick={() => step(1)} aria-label={pick(ui.looks.lightboxNext, locale)}>
                <span aria-hidden="true">→</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </dialog>
  );
}
