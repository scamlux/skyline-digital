"use client";

import { useState } from "react";
import { pick, type Locale } from "../types";
import { priceParts } from "./format";
import { useLive } from "./live";
import { planDraft } from "./plan-store";
import { effectiveService, type ScheduleData } from "./schedule";
import { clinicUi as ui } from "./ui";

const IMG = "/templates/clinic/img";
const START = 52;

/**
 * Слайдер «до / после» отбеливания: перетаскиваемая граница и настоящий input[type=range] поверх
 * (клавиатура и скринридер работают сами). Граница двигается через transform, срез — через
 * clip-path без анимации: на каждый кадр перетаскивания страница не перерисовывается целиком.
 * Фото — иллюстрация, подписано как иллюстрация.
 */
export function WhitenSlider({ sched, before, after, locale }: { sched: ScheduleData; before: string; after: string; locale: Locale }) {
  const [p, setP] = useState(START);
  const { ov } = useLive();
  const base = sched.services.find((s) => s.id === "whitening");
  const svc = base ? effectiveService(base, ov) : null;
  const price = svc && !svc.hidden ? priceParts(svc.min, svc.max, locale, { free: pick(ui.hero.free, locale), upTo: pick(ui.hero.upTo, locale) }) : null;
  const src = (name: string, w: 480 | 960) => `${IMG}/${name}-${w}.webp`;

  return (
    <div className="cl-whiten">
      <div className="cl-ba" style={{ "--p": `${p}%` } as React.CSSProperties}>
        {/* eslint-disable-next-line @next/next/no-img-element -- переносимый шаблон: без next/image */}
        <img className="cl-ba-after" src={src(after, 960)} srcSet={`${src(after, 480)} 480w, ${src(after, 960)} 960w`} sizes="(max-width: 860px) calc(100vw - 32px), 640px" width={960} height={720} alt={pick(ui.photoAlt.after, locale)} loading="lazy" decoding="async" />
        {/* eslint-disable-next-line @next/next/no-img-element -- переносимый шаблон: без next/image */}
        <img className="cl-ba-before" data-same={before === after ? "" : undefined} src={src(before, 960)} srcSet={`${src(before, 480)} 480w, ${src(before, 960)} 960w`} sizes="(max-width: 860px) calc(100vw - 32px), 640px" width={960} height={720} alt={pick(ui.photoAlt.before, locale)} loading="lazy" decoding="async" />
        <span className="cl-ba-tag cl-ba-tag-l">{pick(ui.whiten.before, locale)}</span>
        <span className="cl-ba-tag cl-ba-tag-r">{pick(ui.whiten.after, locale)}</span>
        <span className="cl-ba-ill">{pick(ui.whiten.illustration, locale)}</span>
        <input type="range" min={0} max={100} step={1} value={p} onChange={(e) => setP(Number(e.target.value))} aria-label={pick(ui.whiten.range, locale)} aria-valuetext={`${p}%`} />
        <span className="cl-ba-handle" aria-hidden="true">
          <i />
        </span>
      </div>
      <div className="cl-whiten-side">
        <p className="cl-big">
          <b>3–5</b> <span>{pick(ui.whiten.tones, locale)}</span>
        </p>
        <p className="cl-whiten-price">
          <small>{pick(ui.whiten.session, locale)}</small>
          {price ? (
            <>
              <b>{price.num}</b> <span>{price.unit}</span>
            </>
          ) : null}
        </p>
        <button type="button" className="cl-btn" onClick={() => planDraft.send({ serviceId: "whitening" })}>
          {pick(ui.book, locale)}
        </button>
      </div>
    </div>
  );
}
