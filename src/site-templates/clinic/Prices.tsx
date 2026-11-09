"use client";

import { pick, type Locale, type SiteMode } from "../types";
import { formatSum } from "../types";
import { fill, priceParts } from "./format";
import { useLive } from "./live";
import { planDraft } from "./plan-store";
import { calcPlan, effectiveService, type ScheduleData } from "./schedule";
import { clinicUi as ui } from "./ui";

/** Ячейка бенто: услуга с ценой или фото с подписью (фото — статичные, цена живая). */
export interface BentoCell {
  id: string;
  name: string;
  unit: string;
  /** Размер в сетке: колонки × ряды (на телефоне 2 колонки). */
  span?: "wide" | "big" | "tall";
  photo?: string;
  /** Реальный размер файла (480-й), чтобы у <img> были верные width/height. */
  photoSize?: { w: number; h: number };
  /** Подпись фото вместо цены (3D-снимок). */
  caption?: string;
  accent?: boolean;
}

export interface PackageCard {
  id: string;
  name: string;
  includes: string[];
  items: { id: string; qty: number }[];
  instalmentMonths?: number;
}

const IMG = "/templates/clinic/img";

/** Бенто цен: каждая ячейка — вилка «от–до» крупными цифрами; касание открывает запись на эту услугу. */
export function PriceBento({ cells, sched, locale }: { cells: BentoCell[]; sched: ScheduleData; locale: Locale }) {
  const { ov } = useLive();
  const words = { free: pick(ui.prices.free, locale), upTo: pick(ui.hero.upTo, locale) };
  return (
    <ul className="cl-bento">
      {cells.map((c) => {
        const base = sched.services.find((s) => s.id === c.id);
        const svc = base ? effectiveService(base, ov) : null;
        if (svc?.hidden) return null;
        const price = svc ? priceParts(svc.min, svc.max, locale, words) : null;
        return (
          <li key={c.id} data-span={c.span} data-photo={c.photo ? "" : undefined} data-accent={c.accent ? "" : undefined}>
            {svc ? (
              <button type="button" onClick={() => planDraft.send({ serviceId: c.id })}>
                <CellBody c={c} price={price} />
              </button>
            ) : (
              <div>
                <CellBody c={c} price={price} />
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function CellBody({ c, price }: { c: BentoCell; price: { num: string; unit: string } | null }) {
  return (
    <>
      {c.photo && (
        // eslint-disable-next-line @next/next/no-img-element -- переносимый шаблон: без next/image
        <img src={`${IMG}/${c.photo}-480.webp`} srcSet={`${IMG}/${c.photo}-480.webp 480w, ${IMG}/${c.photo}-960.webp 960w`} sizes="(max-width: 860px) 50vw, 320px" width={c.photoSize?.w ?? 480} height={c.photoSize?.h ?? 480} alt="" loading="lazy" decoding="async" />
      )}
      <span className="cl-bento-name">{c.name}</span>
      <span className="cl-bento-price">
        {c.caption ? (
          <b className="cl-bento-cap">{c.caption}</b>
        ) : price ? (
          <>
            <b>{price.num}</b> <small>{price.unit}</small>
          </>
        ) : null}
      </span>
      <span className="cl-bento-unit">{c.unit}</span>
    </>
  );
}

/** Пакеты: цена считается по текущему прайсу, рассрочка — демо-платёж в месяц. */
export function Packages({ packages, sched, locale, mode = "demo" }: { packages: PackageCard[]; sched: ScheduleData; locale: Locale; mode?: SiteMode }) {
  const { ov } = useLive();
  const words = { free: pick(ui.prices.free, locale), upTo: pick(ui.hero.upTo, locale) };
  return (
    <ul className="cl-packs">
      {packages.map((pkg) => {
        const total = calcPlan(sched, ov, pkg.items);
        if (total.items.length === 0) return null;
        const price = priceParts(total.min, total.max, locale, words);
        return (
          <li key={pkg.id}>
            <h3>{pkg.name}</h3>
            <ul className="cl-incl">
              {pkg.includes.map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ul>
            <p className="cl-pack-price">
              <b>{price.num}</b> <span>{price.unit}</span>
            </p>
            <p className="cl-pack-sub">
              {pkg.instalmentMonths ? fill(pick(mode === "demo" ? ui.prices.perMonth : ui.prices.perMonthClient, locale), { sum: formatSum(Math.round(total.min / pkg.instalmentMonths / 1000) * 1000, locale), n: pkg.instalmentMonths }) : " "}
            </p>
            <button type="button" className="cl-btn ghost" onClick={() => planDraft.send({ items: total.items, serviceId: "consult" })}>
              {pick(ui.book, locale)}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
