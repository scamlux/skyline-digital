"use client";

import { useRef, useState } from "react";
import { formatSum, pick } from "../types";
import { useOverrides } from "./client-bits";
import { useSalon } from "./context";
import { CATEGORIES, type Category } from "./data";
import { bookingDraft, goToBooking } from "./draft-store";
import { formatMinutes } from "./format";
import { effectiveService } from "./schedule";
import { salonUi as ui } from "./ui";

/**
 * Прайс-лист с вкладками «Мужской зал / Женский зал / Борода и уход». Цена, длительность и
 * скрытие берутся из правок кабинета — владелец поменял, сайт показал сразу.
 */
export function ServicesList() {
  const { services, locale } = useSalon();
  const ov = useOverrides();
  const [cat, setCat] = useState<Category>("men");
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const rows = services
    .filter((s) => s.cat === cat)
    .map((s) => ({ ...s, ...effectiveService({ id: s.id, minutes: s.minutes, price: s.price }, ov) }))
    .filter((s) => !s.hidden);

  function onKey(e: React.KeyboardEvent, index: number) {
    const dir = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    if (!dir) return;
    e.preventDefault();
    const next = CATEGORIES[(index + dir + CATEGORIES.length) % CATEGORIES.length];
    setCat(next);
    tabRefs.current[next]?.focus();
  }

  return (
    <div className="sl-price">
      <div className="sl-tabs" role="tablist" aria-label={pick(ui.services.tabsLabel, locale)}>
        {CATEGORIES.map((c, i) => (
          <button
            key={c}
            ref={(el) => {
              tabRefs.current[c] = el;
            }}
            type="button"
            role="tab"
            id={`tab-${c}`}
            aria-selected={cat === c}
            aria-controls="price-panel"
            tabIndex={cat === c ? 0 : -1}
            onClick={() => setCat(c)}
            onKeyDown={(e) => onKey(e, i)}
          >
            {pick(ui.services[c], locale)}
          </button>
        ))}
      </div>
      <ul className="sl-price-list" role="tabpanel" id="price-panel" aria-labelledby={`tab-${cat}`}>
        {rows.length === 0 && <li className="sl-note">{pick(ui.services.empty, locale)}</li>}
        {rows.map((s) => (
          <li key={s.id} className="sl-price-row" data-pointer>
            <div className="sl-price-main">
              <h3>{s.name}</h3>
              <p>{s.blurb}</p>
            </div>
            <span className="sl-price-min">{formatMinutes(s.minutes, locale)}</span>
            <b className="sl-price-sum">{s.price === 0 ? "0" : formatSum(s.price, locale)}</b>
            <button
              type="button"
              className="sl-price-book"
              onClick={() => {
                bookingDraft.send({ serviceIds: [s.id] });
                goToBooking();
              }}
              aria-label={`${pick(ui.services.book, locale)}: ${s.name}`}
            >
              {pick(ui.services.book, locale)} <span aria-hidden="true">→</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
