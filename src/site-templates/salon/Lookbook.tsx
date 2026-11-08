"use client";

import { useState } from "react";
import { formatSum, pick } from "../types";
import { useOverrides } from "./client-bits";
import { useSalon } from "./context";
import { bookingDraft } from "./draft-store";
import { formatMinutes } from "./format";
import { Icon } from "./icons";
import { basketOf } from "./schedule";
import { useSalonStore } from "./context";
import { salonUi as ui } from "./ui";

const IMG = "/templates/salon/img";

/**
 * Лукбук: чипы-фильтры и горизонтальная лента со scroll-snap (свайп, колесо, трекпад). У каждой
 * карточки своя кнопка «Записаться»: она открывает запись сразу с услугами и мастером этого образа.
 */
export function Lookbook() {
  const { looks, filters, masters, sched, locale } = useSalon();
  const ov = useOverrides();
  const { demo } = useSalonStore();
  const [filter, setFilter] = useState("all");
  const shown = filter === "all" ? looks : looks.filter((l) => l.tags.includes(filter));

  return (
    <div className="sl-look">
      <div className="sl-chips sl-chips-scroll" role="group" aria-label={pick(ui.looks.filters, locale)}>
        <button type="button" className="sl-chip" aria-pressed={filter === "all"} onClick={() => setFilter("all")}>
          {pick(ui.looks.all, locale)}
        </button>
        {filters.map((f) => (
          <button key={f.id} type="button" className="sl-chip" aria-pressed={filter === f.id} onClick={() => setFilter(f.id)}>
            {f.name}
          </button>
        ))}
      </div>
      <ul className="sl-look-track sl-snap" aria-label={pick(ui.looks.label, locale)}>
        {shown.length === 0 && <li className="sl-note">{pick(ui.looks.empty, locale)}</li>}
        {shown.map((l) => {
          const basket = basketOf(sched, ov, l.serviceIds);
          const master = masters.find((m) => m.id === l.masterId);
          const disabled = basket.ids.length === 0;
          return (
            <li key={l.id} className="sl-look-item">
              <figure>
                {/* eslint-disable-next-line @next/next/no-img-element -- шаблон переносимый: без next/image */}
                <img
                  src={`${IMG}/${l.photo}-480.webp`}
                  srcSet={`${IMG}/${l.photo}-240.webp 240w, ${IMG}/${l.photo}-480.webp 480w, ${IMG}/${l.photo}-960.webp 960w`}
                  sizes="(max-width: 860px) 66vw, 320px"
                  width={960}
                  height={1200}
                  alt={l.alt}
                  loading="lazy"
                  decoding="async"
                  draggable={false}
                />
                <figcaption>
                  <b>{l.title}</b>
                  <span>
                    {formatSum(basket.price, locale)} · {formatMinutes(basket.minutes, locale)}
                  </span>
                </figcaption>
              </figure>
              <button
                type="button"
                className="sl-btn sl-look-book"
                disabled={disabled}
                onClick={() => {
                  demo.track("look");
                  bookingDraft.open({ serviceIds: basket.ids, masterId: master?.id ?? null, lookId: l.id, step: 2 });
                }}
              >
                {pick(ui.book, locale)}
                <Icon id="arrow" size={18} />
                <span className="sr-only"> — {l.title}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
