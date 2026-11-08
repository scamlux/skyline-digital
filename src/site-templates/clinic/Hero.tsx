"use client";

import { useEffect, useState } from "react";
import { plural } from "../kit/plural";
import { pick, type Locale } from "../types";
import type { SymptomIcon } from "./data";
import { priceParts, visitsText } from "./format";
import { SymptomGlyph } from "./icons";
import { NextSlot, useLive } from "./live";
import { planDraft } from "./plan-store";
import { optionsRange, type ScheduleData } from "./schedule";
import { clinicUi as ui } from "./ui";

/** Плитка с уже локализованными текстами и врачом: клиенту уходит только нужное. */
export interface HeroTile {
  id: string;
  icon: SymptomIcon;
  label: string;
  line: string;
  options: string[];
  bookService: string;
  doctor: { id: string; name: string; role: string; photo: string };
}

const IMG = "/templates/clinic/img";

/**
 * Первый экран: плитки «Что беспокоит?» и панель решения. Одно касание — одна строка про то,
 * что сделаем, вилка цены, число визитов, врач с ближайшим окном и «Записаться». Цена идёт
 * с учётом правок владельца, окно — из той же сетки, что и запись.
 */
export function SymptomTiles({ tiles, sched, locale }: { tiles: HeroTile[]; sched: ScheduleData; locale: Locale }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const { ov } = useLive();
  const tile = tiles.find((x) => x.id === openId) ?? null;
  const range = tile ? optionsRange(sched, ov, tile.options) : null;
  const price = range ? priceParts(range.min, range.max, locale, { free: pick(ui.hero.free, locale), upTo: pick(ui.hero.upTo, locale) }) : null;
  // Панель появляется под плитками: на телефоне подводим её в видимую область.
  useEffect(() => {
    if (!openId) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    document.getElementById("cl-panel")?.scrollIntoView({ block: "nearest", behavior: reduce ? "auto" : "smooth" });
  }, [openId]);
  const visitWord = range ? plural(locale, range.visitsMax, ui.visitWord[locale]) : "";

  return (
    <>
      <div className="cl-tiles" role="group" aria-label={pick(ui.hero.title, locale)}>
        {tiles.map((x) => (
          <button key={x.id} type="button" className="cl-tile" aria-pressed={x.id === openId} aria-controls="cl-panel" onClick={() => setOpenId(x.id === openId ? null : x.id)}>
            <span className="cl-tile-ico">
              <SymptomGlyph icon={x.icon} />
            </span>
            <span className="cl-tile-label">{x.label}</span>
          </button>
        ))}
      </div>

      <aside id="cl-panel" className="cl-panel" data-open={tile ? "" : undefined} aria-label={pick(ui.hero.panelLabel, locale)} inert={!tile}>
        {tile && (
          <>
            <div className="cl-panel-head">
              <span className="cl-panel-ico">
                <SymptomGlyph icon={tile.icon} />
              </span>
              <h2>{tile.label}</h2>
              <button type="button" className="cl-x" onClick={() => setOpenId(null)} aria-label={pick(ui.hero.close, locale)}>
                <span aria-hidden="true">×</span>
              </button>
            </div>
            <p className="cl-panel-line">{tile.line}</p>
            <dl className="cl-panel-facts">
              <div>
                <dt>{pick(ui.hero.price, locale)}</dt>
                <dd>
                  {price ? (
                    <>
                      <b>{price.num}</b> <span>{price.unit}</span>
                    </>
                  ) : (
                    "—"
                  )}
                </dd>
              </div>
              <div>
                <dt>{pick(ui.hero.visits, locale)}</dt>
                <dd>
                  <b>{range ? visitsText(range.visitsMin, range.visitsMax, "").trim() : "—"}</b> <span>{visitWord}</span>
                </dd>
              </div>
            </dl>
            <div className="cl-panel-doc">
              {/* eslint-disable-next-line @next/next/no-img-element -- переносимый шаблон: без next/image */}
              <img src={`${IMG}/${tile.doctor.photo}-480.webp`} width={56} height={56} alt="" loading="lazy" decoding="async" />
              <div>
                <b>{tile.doctor.name}</b>
                <span>{tile.doctor.role}</span>
              </div>
              <div className="cl-panel-next">
                <small>{pick(ui.hero.next, locale)}</small>
                <NextSlot sched={sched} serviceId={tile.bookService} doctorId={tile.doctor.id} locale={locale} />
              </div>
            </div>
            <button type="button" className="cl-btn" onClick={() => planDraft.send({ serviceId: tile.bookService, doctorId: tile.doctor.id })}>
              {pick(ui.book, locale)}
            </button>
          </>
        )}
      </aside>
    </>
  );
}
