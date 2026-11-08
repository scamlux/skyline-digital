"use client";

import { useMemo, useState } from "react";
import { Carousel } from "../kit/carousel";
import { plural } from "../kit/plural";
import { formatSum, pick, type L, type Locale } from "../types";
import { normalizeSelection, qtyOfItem, unitPrice, type Selection } from "./pricing";
import { cartStore, useCart } from "./cart-store";
import { CATS, OPTIONS, menu, photoOf, type Cat, type MenuItem } from "./data";
import { IconCheck, IconClose, IconPlus } from "./icons";
import { Glyph, Photo } from "./media";
import { Sheet } from "./Sheet";
import { effective, effectiveAll, type Effective } from "./shop";
import { useCafeState } from "./store";
import { cafeUi as ui, leftForms } from "./ui";

/** Остаток витрины словами: «осталось 3» (форма по числу). */
const leftText = (locale: Locale, n: number) => plural(locale, n, leftForms[locale]).replace("{n}", String(n));

/** Можно ли добавить ещё одну штуку позиции с учётом остатка и того, что уже в корзине. */
const canAddMore = (e: Effective, inCart: number) => e.orderable && (e.stock === undefined || inCart < e.stock);

/** Нажатие «+»: позиция с опциями открывает выбор, без опций сразу попадает в корзину. */
function addOrConfigure(item: MenuItem) {
  if (item.options.length > 0) cartStore.openOptions(item.id);
  else cartStore.add(item.id, {});
}

function Badge({ e, locale }: { e: Effective; locale: Locale }) {
  if (e.off) return <span className="cf-badge off">{pick(ui.offToday, locale)}</span>;
  if (e.soldOut) return <span className="cf-badge off">{pick(ui.soldOut, locale)}</span>;
  if (e.stock !== undefined && e.stock <= 5) return <span className="cf-badge left">{leftText(locale, e.stock)}</span>;
  if (e.item.tag) return <span className="cf-badge tag">{pick(ui.tags[e.item.tag], locale)}</span>;
  return null;
}

function Pic({ item, sizes, widths }: { item: MenuItem; sizes: string; widths: (240 | 480 | 960)[] }) {
  const photo = photoOf(item);
  if (photo) return <Photo name={photo} widths={widths} src={480} width={480} height={480} sizes={sizes} loading="lazy" />;
  return <Glyph kind={item.glyph} />;
}

function ItemCard({ e, locale, big }: { e: Effective; locale: Locale; big?: boolean }) {
  const cart = useCart();
  const { item } = e;
  const inCart = qtyOfItem(cart.lines, item.id);
  const disabled = !canAddMore(e, inCart);
  const name = pick(item.name, locale);
  return (
    <li className="cf-card" data-off={!e.orderable || undefined} data-big={big || undefined}>
      <div className="cf-card-top">
        <span className="cf-card-ph" data-glyph={!photoOf(item) || undefined}>
          <Pic item={item} sizes={big ? "(max-width: 760px) 70vw, 300px" : "(max-width: 760px) 46vw, (max-width: 1100px) 30vw, 22vw"} widths={[240, 480, 960]} />
        </span>
        <Badge e={e} locale={locale} />
        <button type="button" className="cf-add" data-in={inCart > 0 || undefined} disabled={disabled} onClick={() => addOrConfigure(item)} aria-label={`${pick(ui.addAria, locale)}: ${name}`}>
          {inCart > 0 ? <b>{inCart}</b> : <IconPlus />}
        </button>
      </div>
      <div className="cf-card-text">
        {/* Название — кнопка, растянутая на всю карточку (::after): касание по фото тоже добавляет позицию. */}
        <button type="button" className="cf-card-open" onClick={() => addOrConfigure(item)} disabled={disabled}>
          {name}
        </button>
        <span className="cf-card-price">{formatSum(e.price, locale)}</span>
        {e.stock !== undefined && big && <StockMeter e={e} locale={locale} />}
      </div>
    </li>
  );
}

/** Полоска остатка: оставшаяся доля от дневной нормы (scaleX — только transform). */
function StockMeter({ e, locale }: { e: Effective; locale: Locale }) {
  const base = e.item.stock ?? 1;
  const left = e.stock ?? 0;
  const share = Math.max(0, Math.min(1, left / base));
  return (
    <span className="cf-meter" data-low={left <= 2 || undefined}>
      <span className="cf-meter-bar" aria-hidden="true">
        <i style={{ transform: `scaleX(${share})` }} />
      </span>
      <span className="cf-meter-t" aria-live="polite">
        {left <= 0 ? pick(ui.soldOut, locale) : leftText(locale, left)}
      </span>
    </span>
  );
}

/** Меню: категории-«пилюли» и сетка фото-карточек. */
export function MenuSection({ locale }: { locale: Locale }) {
  const state = useCafeState();
  const [cat, setCat] = useState<Cat>("coffee");
  const items = useMemo(() => effectiveAll(state).filter((e) => e.item.cat === cat && !e.hidden), [state, cat]);
  return (
    <section className="cf-sec cf-menu" id="menu" aria-labelledby="menu-title" data-reveal>
      <div className="cf-sec-head">
        <h2 id="menu-title">{pick(ui.menuTitle, locale)}</h2>
        <p>{pick(ui.menuLead, locale)}</p>
      </div>
      <div className="cf-cats" role="group" aria-label={pick(ui.catsLabel, locale)}>
        {CATS.map((c) => (
          <button key={c} type="button" aria-pressed={c === cat} onClick={() => setCat(c)}>
            {pick(ui.cats[c], locale)}
          </button>
        ))}
      </div>
      <ul className="cf-grid" aria-label={pick(ui.cats[cat], locale)}>
        {items.map((e) => (
          <ItemCard key={e.item.id} e={e} locale={locale} />
        ))}
      </ul>
    </section>
  );
}

/** «Сегодня в витрине»: выпечка и десерты с живым остатком (правится в кабинете). */
export function Showcase({ locale }: { locale: Locale }) {
  const state = useCafeState();
  const items = useMemo(() => effectiveAll(state).filter((e) => e.item.stock !== undefined && !e.hidden), [state]);
  if (items.length === 0) return null;
  return (
    <section className="cf-sec cf-case" id="case" aria-labelledby="case-title" data-reveal>
      <div className="cf-sec-head">
        <h2 id="case-title">{pick(ui.showcaseTitle, locale)}</h2>
        <p>{pick(ui.showcaseLead, locale)}</p>
      </div>
      <Carousel label={pick(ui.showcaseLabel, locale)} prevLabel={pick(ui.prev, locale)} nextLabel={pick(ui.next, locale)}>
        {items.map((e) => (
          <ul className="cf-case-slide" key={e.item.id}>
            <ItemCard e={e} locale={locale} big />
          </ul>
        ))}
      </Carousel>
    </section>
  );
}

const labelOf = (l: L, locale: Locale) => pick(l, locale);

/** Выбор опций напитка: чипы размера, молока и сиропа, цена обновляется на лету. */
function ItemOptions({ item, locale }: { item: MenuItem; locale: Locale }) {
  const state = useCafeState();
  const e = effective(item, state);
  const [sel, setSel] = useState<Selection>(() => normalizeSelection(item.options));
  const total = unitPrice(e.price, item.options, sel);
  const name = pick(item.name, locale);
  return (
    <>
      <div className="cf-opt-head">
        {photoOf(item) ? <Photo name={photoOf(item)!} widths={[240, 480]} src={240} width={240} height={240} sizes="72px" /> : <span className="cf-opt-glyph"><Glyph kind={item.glyph} /></span>}
        <div>
          <h2>{name}</h2>
          <p className="cf-opt-price" aria-live="polite">
            {formatSum(total, locale)}
          </p>
        </div>
        <button type="button" className="cf-x" onClick={() => cartStore.closeOptions()} aria-label={pick(ui.item.close, locale)}>
          <IconClose />
        </button>
      </div>
      {item.options.map((kind) => {
        const group = OPTIONS[kind];
        return (
          <div key={kind} className="cf-opt-group" role="radiogroup" aria-label={labelOf(group.title, locale)}>
            <span className="cf-opt-title">{labelOf(group.title, locale)}</span>
            <div className="cf-chips">
              {group.choices.map((c) => {
                const checked = sel[kind] === c.id;
                return (
                  <button key={c.id} type="button" role="radio" aria-checked={checked} className="cf-chip" onClick={() => setSel({ ...sel, [kind]: c.id })}>
                    {checked && <IconCheck />}
                    {labelOf(c.label, locale)}
                    {c.delta > 0 && <small>+{c.delta / 1000}k</small>}
                    {c.promo && <small className="promo">{pick(ui.promoZero, locale)}</small>}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
      <button
        type="button"
        className="cf-cta"
        onClick={() => {
          cartStore.add(item.id, sel);
          cartStore.closeOptions();
        }}
      >
        {pick(ui.item.add, locale)} · {formatSum(total, locale)}
      </button>
    </>
  );
}

/** Шторка выбора опций; открыта, когда в корзине-хранилище выбрана позиция. */
export function OptionsSheet({ locale }: { locale: Locale }) {
  const cart = useCart();
  const item = menu.find((m) => m.id === cart.optionsFor);
  return (
    <Sheet open={!!item} onClose={() => cartStore.closeOptions()} label={item ? pick(item.name, locale) : pick(ui.customise, locale)} className="cf-opt">
      {item && <ItemOptions key={item.id} item={item} locale={locale} />}
    </Sheet>
  );
}
