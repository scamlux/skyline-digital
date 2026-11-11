"use client";

import { fill } from "./format";
import { pick, type Locale } from "../types";
import { CARD_SLOTS, STAMPS_GOAL, freeCupReady } from "./pricing";
import { Almond, IconCup } from "./icons";
import { demo, useCafeState } from "./store";
import { cafeUi as ui } from "./ui";

/**
 * Карта «6-й кофе бесплатно»: пять мест под печати-миндалины и шестое, подарочное, с чашкой.
 * Каждый заказ с сайта ставит печать (хранилище, localStorage); после пяти печатей карта
 * «открывается»: чашка заполняется и появляется наклейка «бесплатно».
 * Текста почти нет: смысл читается по картинке.
 */
export function LoyaltyCard({ locale, name }: { locale: Locale; name: string }) {
  const { stamps } = useCafeState();
  const ready = freeCupReady(stamps);
  return (
    <section className="cf-sec cf-loyal" id="card" aria-labelledby="card-title" data-reveal>
      <div className="cf-sec-head">
        <h2 id="card-title">{pick(ui.loyalty.title, locale)}</h2>
        <p>{pick(ui.loyalty.lead, locale)}</p>
      </div>
      <div className="cf-stampcard" data-ready={ready || undefined} role="group" aria-label={fill(pick(ui.loyalty.cardLabel, locale), { name })}>
        <ol className="cf-stamps">
          {Array.from({ length: CARD_SLOTS }, (_, i) => {
            const last = i === CARD_SLOTS - 1;
            const filled = last ? ready : i < stamps;
            return (
              <li key={`${i}-${filled ? "f" : "e"}`} className="cf-stamp" data-filled={filled || undefined} data-last={last || undefined} aria-label={fill(pick(ui.loyalty.stampAria, locale), { n: i + 1 })}>
                {last ? <IconCup /> : <Almond />}
              </li>
            );
          })}
        </ol>
        <p className="cf-stamp-count" aria-live="polite">
          {ready ? pick(ui.loyalty.ready, locale) : fill(pick(ui.loyalty.progress, locale), { n: stamps, goal: STAMPS_GOAL })}
        </p>
        <span className="cf-free-sticker" aria-hidden={!ready}>
          {pick(ui.loyalty.free, locale)}
        </span>
        <button type="button" className="cf-ghost sm" onClick={() => demo.addStamp()} disabled={ready}>
          {pick(ui.loyalty.addDemo, locale)}
        </button>
      </div>
    </section>
  );
}
