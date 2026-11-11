"use client";

import { useEffect, useState } from "react";
import { useHydrated, useMinuteClock } from "../kit/hooks";
import { DigestTelegramButton, digestCopy } from "../kit/digest-button";
import { itemCode } from "../kit/digest-payload";
import { plural } from "../kit/plural";
import { addDays, tashkentNow, weekdayOf } from "../kit/tashkent";
import { formatSum, pick, type L, type Locale } from "../types";
import { adminUi as ui, adminWords as words } from "./admin-ui";
import { STAMPS_GOAL } from "./pricing";
import { CATS, itemById, menu, photoOf, type CafeData } from "./data";
import { fill, optionWords, pickupLabel } from "./format";
import { IconMinus, IconPlus } from "./icons";
import { Glyph, Photo } from "./media";
import { buildSeedOrders } from "./seed";
import { effective } from "./shop";
import { countEvents, ordersIn, periodStats, topDrinks, WEEK_MS } from "./stats";
import { demo, useCafeState, type Order, type OrderStatus } from "./store";
import { cafeUi } from "./ui";

type Tab = "overview" | "orders" | "menu" | "case" | "loyalty" | "promo";
const TABS: Tab[] = ["overview", "orders", "menu", "case", "loyalty", "promo"];
const ADMIN_CSS = "/templates/cafe-admin.css";
const FONT_PRELOADS = ["/templates/fonts/nunito-latin.woff2", "/templates/fonts/nunito-cyrillic.woff2"] as const;
const DAY_MS = 86_400_000;
const WEEK = 7;
const SAVED_FLASH_MS = 1200;

const w = (locale: Locale, k: keyof typeof words, n: number) => plural(locale, n, words[k][locale]);
const itemName = (id: string, locale: Locale) => pick(itemById(id)?.name ?? { ru: id, en: id, uz: id }, locale);

/**
 * Кабинет владельца кофейни (демо). Шесть экранов: Обзор, Заказы, Меню и цены, Витрина,
 * Лояльность, Акция. Всё читает и пишет демо-хранилище; тот же интерфейс в боевом сайте идёт поверх базы.
 */
export function CafeAdmin({ data, locale, siteHref, localeHrefs, digestBot }: { data: CafeData; locale: Locale; siteHref: string; localeHrefs: Record<Locale, string>; digestBot?: string }) {
  const t = (l: L) => pick(l, locale);
  const [tab, setTab] = useState<Tab>("overview");
  const state = useCafeState();
  const hydrated = useHydrated();
  const clock = useMinuteClock();
  const ready = hydrated && !!state.seededAt && clock > 0;

  // Пустой кабинет не показывает ничего — при первом открытии наполняем примерами.
  // Заказы с сайта при этом остаются (seed сливает данные).
  useEffect(() => {
    if (hydrated && !state.seededAt) demo.seed(buildSeedOrders(Date.now(), data.hours));
  }, [hydrated, state.seededAt, data.hours]);

  const newCount = state.orders.filter((o) => o.status === "new").length;

  return (
    <div className="adm" data-tpl="cafe" lang={locale === "uz" ? "uz-Latn" : locale}>
      <link rel="stylesheet" href={ADMIN_CSS} precedence="default" />
      {FONT_PRELOADS.map((href) => (
        <link key={href} rel="preload" href={href} as="font" type="font/woff2" crossOrigin="" />
      ))}
      <header className="adm-head">
        <div className="adm-title">
          <span className="adm-badge">{t(ui.demo.badge)}</span>
          <strong className="adm-name">{data.name}</strong>
        </div>
        <div className="adm-head-r">
          <nav className="adm-lang" aria-label={t(ui.langLabel)}>
            {(["ru", "en", "uz"] as Locale[]).map((l) => (
              <a key={l} href={localeHrefs[l]} hrefLang={l} lang={l} aria-current={l === locale ? "true" : undefined}>
                {l.toUpperCase()}
              </a>
            ))}
          </nav>
          <a className="adm-open" href={siteHref}>
            {t(ui.openSite)} ↗
          </a>
        </div>
      </header>

      <nav className="adm-tabs" aria-label={t(ui.tabsLabel)}>
        {TABS.map((k) => (
          <button key={k} type="button" aria-current={tab === k ? "page" : undefined} onClick={() => setTab(k)}>
            {t(ui.tabs[k])}
            {k === "orders" && ready && newCount > 0 && <i className="adm-dot" aria-label={t(ui.orders.status.new)} />}
          </button>
        ))}
      </nav>

      <main className="adm-main">
        {!ready && <div className="adm-skel" role="status" aria-label={t(ui.loading)} />}
        {ready && tab === "overview" && <Overview data={data} locale={locale} now={clock} orders={state.orders} events={state.events} digestBot={digestBot} />}
        {ready && tab === "orders" && <Orders locale={locale} now={clock} orders={state.orders} />}
        {ready && tab === "menu" && <MenuTab locale={locale} />}
        {ready && tab === "case" && <CaseTab locale={locale} />}
        {ready && tab === "loyalty" && <LoyaltyTab locale={locale} />}
        {ready && tab === "promo" && <PromoTab data={data} locale={locale} />}
      </main>

      <footer className="adm-foot">
        <p>{t(ui.demo.text)}</p>
        <div>
          <button type="button" className="adm-link" onClick={() => demo.seed(buildSeedOrders(Date.now(), data.hours))}>
            {t(ui.demo.seed)}
          </button>
          <button type="button" className="adm-link" onClick={() => demo.reset()}>
            {t(ui.demo.reset)}
          </button>
        </div>
      </footer>
    </div>
  );
}

/* ——— Обзор ——— */

function Overview({ data, locale, now, orders, events, digestBot }: { data: CafeData; locale: Locale; now: number; orders: Order[]; events: { at: string; type: import("./store").EventType }[]; digestBot?: string }) {
  const t = (l: L) => pick(l, locale);
  const cur = periodStats(orders, now - WEEK_MS, now + 1);
  const prev = periodStats(orders, now - 2 * WEEK_MS, now - WEEK_MS);
  const views = countEvents(events, "view", now - WEEK_MS, now + 1);
  const viewsPrev = countEvents(events, "view", now - 2 * WEEK_MS, now - WEEK_MS);
  const delta = (a: number, b: number) => (b > 0 ? Math.round(((a - b) / b) * 100) : null);
  const top = topDrinks(orders, now - WEEK_MS, now + 1);
  const maxTop = Math.max(1, ...top.map((x) => x.qty));

  const stats = [
    { k: "orders" as const, text: String(cur.count), d: delta(cur.count, prev.count) },
    { k: "revenue" as const, text: formatSum(cur.revenue, locale), d: delta(cur.revenue, prev.revenue) },
    { k: "avg" as const, text: formatSum(cur.avg, locale), d: delta(cur.avg, prev.avg) },
    { k: "views" as const, text: String(views), d: delta(views, viewsPrev) },
  ];

  // Заказы по дням: последние 7 суток по Ташкенту, по дате создания заказа.
  const today = tashkentNow(now).iso;
  const days = Array.from({ length: WEEK }, (_, i) => addDays(today, i - (WEEK - 1)));
  const live = ordersIn(orders, now - WEEK * DAY_MS - DAY_MS, now + 1);
  const perDay = days.map((iso) => live.filter((o) => tashkentNow(Date.parse(o.at)).iso === iso).length);
  const maxDay = Math.max(1, ...perDay);
  const recent = [...orders].sort((a, b) => b.at.localeCompare(a.at)).slice(0, 3);
  const hit = top[0] ? itemName(top[0].itemId, locale) : t(ui.digest.noDrink);

  return (
    <section aria-label={t(ui.tabs.overview)}>
      <p className="adm-period">{t(ui.period)}</p>
      <div className="adm-stats">
        {stats.map((s) => (
          <div key={s.k} className="adm-stat">
            <b>{s.text}</b>
            <span>{t(ui.stats[s.k])}</span>
            {s.d !== null && (
              <em data-up={s.d >= 0 || undefined}>
                {s.d >= 0 ? "+" : ""}
                {s.d}% {t(ui.vsPrev)}
              </em>
            )}
          </div>
        ))}
      </div>

      <h2 className="adm-h2">{t(ui.topTitle)}</h2>
      {top.length === 0 ? (
        <p className="adm-hint">{t(ui.topEmpty)}</p>
      ) : (
        <ol className="adm-top">
          {top.map((x) => (
            <li key={x.itemId}>
              <span className="adm-top-name">{itemName(x.itemId, locale)}</span>
              <span className="adm-top-bar" aria-hidden="true">
                <i style={{ transform: `scaleX(${x.qty / maxTop})` }} />
              </span>
              <b>{x.qty}</b>
            </li>
          ))}
        </ol>
      )}

      <h2 className="adm-h2">{t(ui.byDay)}</h2>
      <div className="adm-bars" role="img" aria-label={`${t(ui.byDay)}: ${perDay.join(", ")}`}>
        {perDay.map((n, i) => (
          <div key={days[i]} className="adm-bar">
            <b style={{ height: `${Math.max(6, (n / maxDay) * 100)}%` }} data-n={n} />
            <span>{ui.days[locale][weekdayOf(days[i])]}</span>
          </div>
        ))}
      </div>

      <h2 className="adm-h2">{t(ui.recent)}</h2>
      <OrderList items={recent} locale={locale} now={now} compact />

      <div className="adm-digest">
        <div className="adm-digest-head">
          <h2 className="adm-h2">{t(ui.digest.title)}</h2>
          <span className="adm-sample">{t(ui.digest.sample)}</span>
        </div>
        <p>{digestBot ? t(digestCopy.caption) : t(ui.digest.text)}</p>
        <pre>{`${data.name} · ${t(ui.digest.head)}\n${fill(t(ui.digest.line1), { n: cur.count, sum: formatSum(cur.revenue, locale) })}\n${fill(t(ui.digest.line2), { sum: formatSum(cur.avg, locale) })}\n${fill(t(ui.digest.line3), { drink: hit })}`}</pre>
        <p className="adm-hint">
          {cur.count} {w(locale, "orders", cur.count)} · {views} {w(locale, "views", views)}
        </p>
        {digestBot && (
          <DigestTelegramButton
            bot={digestBot}
            locale={locale}
            payload={{
              tpl: "cafe",
              locale,
              style: "a",
              period: "week",
              values: { orders: cur.count, revenue: cur.revenue, avg: cur.avg, views, drink: top[0] ? itemCode(menu.findIndex((m) => m.id === top[0].itemId)) : 0 },
            }}
          />
        )}
      </div>
    </section>
  );
}

/* ——— Заказы ——— */

const ACTIVE: OrderStatus[] = ["new", "cooking", "ready"];

const NEXT_ACTIONS: Record<OrderStatus, { label: L; to: OrderStatus }[]> = {
  new: [
    { label: ui.orders.toCooking, to: "cooking" },
    { label: ui.orders.cancel, to: "cancelled" },
  ],
  cooking: [
    { label: ui.orders.toReady, to: "ready" },
    { label: ui.orders.cancel, to: "cancelled" },
  ],
  ready: [
    { label: ui.orders.toDone, to: "done" },
    { label: ui.orders.cancel, to: "cancelled" },
  ],
  done: [],
  cancelled: [{ label: ui.orders.restore, to: "new" }],
};

const byPickup = (a: Order, b: Order) => `${a.pickupDate}${a.pickupTime}`.localeCompare(`${b.pickupDate}${b.pickupTime}`);

function Orders({ locale, now, orders }: { locale: Locale; now: number; orders: Order[] }) {
  const t = (l: L) => pick(l, locale);
  const active = orders.filter((o) => ACTIVE.includes(o.status)).sort(byPickup);
  const finished = orders.filter((o) => !ACTIVE.includes(o.status)).sort((a, b) => b.at.localeCompare(a.at));
  return (
    <section aria-label={t(ui.tabs.orders)}>
      {orders.length === 0 && <p className="adm-hint">{t(ui.orders.empty)}</p>}
      <h2 className="adm-h2">{t(ui.orders.active)}</h2>
      {active.length === 0 ? <p className="adm-hint">{t(ui.orders.noActive)}</p> : <OrderList items={active} locale={locale} now={now} />}
      {finished.length > 0 && (
        <>
          <h2 className="adm-h2">{t(ui.orders.finished)}</h2>
          <OrderList items={finished} locale={locale} now={now} />
        </>
      )}
    </section>
  );
}

function OrderList({ items, locale, now, compact }: { items: Order[]; locale: Locale; now: number; compact?: boolean }) {
  const t = (l: L) => pick(l, locale);
  const today = tashkentNow(now).iso;
  return (
    <ul className="adm-leads">
      {items.map((o) => (
        <li key={o.id} className="adm-lead" data-status={o.status}>
          <time className="adm-time" dateTime={`${o.pickupDate}T${o.pickupTime}`}>
            <b>{o.pickupTime}</b>
            <small>{o.pickupDate === today ? t(ui.orders.today) : pickupLabel(o.pickupDate, "", today, locale).replace(/,\s*$/, "")}</small>
          </time>
          <div className="adm-lead-main">
            <b>
              {o.name}
              {o.source === "site" && <em className="adm-site">{t(ui.orders.fromSite)}</em>}
              {o.free && <em className="adm-site free">{t(ui.orders.free)}</em>}
            </b>
            <span>
              {o.lines.map((l) => `${itemName(l.itemId, locale)}${optionWords(l.itemId, l.sel, locale) ? ` (${optionWords(l.itemId, l.sel, locale)})` : ""}${l.qty > 1 ? ` ×${l.qty}` : ""}`).join(" · ")}
            </span>
            <span className="adm-phone">{o.phone}</span>
          </div>
          <div className="adm-lead-side">
            <b className="adm-sum">{formatSum(o.total, locale)}</b>
            <span className="adm-pill">{t(ui.orders.status[o.status])}</span>
            {!compact && (
              <span className="adm-actions">
                {NEXT_ACTIONS[o.status].map((a) => (
                  <button key={a.to} type="button" className="adm-btn sm" data-tone={a.to === "cancelled" ? "bad" : undefined} onClick={() => demo.setStatus(o.id, a.to)}>
                    {t(a.label)}
                  </button>
                ))}
              </span>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}

/* ——— Меню и цены ——— */

/** Цена: кнопка → поле ввода; Enter или потеря фокуса сохраняет, Esc отменяет. */
function NumberEdit({ value, locale, label, saved, onCommit }: { value: number; locale: Locale; label: string; saved: string; onCommit: (n: number) => void }) {
  const [editing, setEditing] = useState(false);
  const [flash, setFlash] = useState(false);
  const commit = (raw: string) => {
    const n = Number(raw.replace(/\D/g, ""));
    if (raw.trim() !== "" && n !== value) {
      onCommit(n);
      setFlash(true);
      window.setTimeout(() => setFlash(false), SAVED_FLASH_MS);
    }
    setEditing(false);
  };
  if (!editing) {
    return (
      <button type="button" className="adm-price" onClick={() => setEditing(true)} aria-label={`${label}: ${formatSum(value, locale)}`}>
        {formatSum(value, locale)}
        {flash && <small> {saved}</small>}
      </button>
    );
  }
  return (
    <input
      className="adm-price-input"
      type="text"
      inputMode="numeric"
      defaultValue={value}
      aria-label={label}
      autoFocus
      onBlur={(e) => commit(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter") commit((e.target as HTMLInputElement).value);
        if (e.key === "Escape") setEditing(false);
      }}
    />
  );
}

function Thumb({ id }: { id: string }) {
  const item = itemById(id);
  if (!item) return null;
  const photo = photoOf(item);
  return <span className="adm-thumb">{photo ? <Photo name={photo} widths={[240]} src={240} width={240} height={240} sizes="48px" loading="lazy" /> : <Glyph kind={item.glyph} />}</span>;
}

function MenuTab({ locale }: { locale: Locale }) {
  const t = (l: L) => pick(l, locale);
  const state = useCafeState();
  return (
    <section aria-label={t(ui.tabs.menu)}>
      <p className="adm-hint">{t(ui.menu.hint)}</p>
      {CATS.map((c) => (
        <div key={c} className="adm-cat">
          <h2 className="adm-h2">{t(cafeUi.cats[c])}</h2>
          <ul className="adm-items">
            {menu
              .filter((m) => m.cat === c)
              .map((m) => {
                const e = effective(m, state);
                return (
                  <li key={m.id} className="adm-item" data-hidden={e.hidden || undefined} data-off={e.off || undefined}>
                    <Thumb id={m.id} />
                    <span className="adm-item-name">
                      {pick(m.name, locale)}
                      {e.hidden && <small>{t(ui.menu.hidden)}</small>}
                      {!e.hidden && e.off && <small>{t(ui.menu.offLabel)}</small>}
                    </span>
                    <NumberEdit value={e.price} locale={locale} label={`${pick(m.name, locale)} — ${t(ui.menu.price)}`} saved={t(ui.menu.saved)} onCommit={(n) => demo.setItem(m.id, { price: n })} />
                    <button type="button" className="adm-btn sm" aria-pressed={e.off} onClick={() => demo.setItem(m.id, { off: !e.off })}>
                      {t(e.off ? ui.menu.on : ui.menu.off)}
                    </button>
                    <button type="button" className="adm-btn sm ghost" aria-pressed={e.hidden} onClick={() => demo.setItem(m.id, { hidden: !e.hidden })}>
                      {t(e.hidden ? ui.menu.show : ui.menu.hide)}
                    </button>
                  </li>
                );
              })}
          </ul>
        </div>
      ))}
    </section>
  );
}

/* ——— Витрина ——— */

function CaseTab({ locale }: { locale: Locale }) {
  const t = (l: L) => pick(l, locale);
  const state = useCafeState();
  const items = menu.filter((m) => m.stock !== undefined);
  return (
    <section aria-label={t(ui.tabs.case)}>
      <p className="adm-hint">{t(ui.case.hint)}</p>
      <ul className="adm-items">
        {items.map((m) => {
          const e = effective(m, state);
          const left = e.stock ?? 0;
          return (
            <li key={m.id} className="adm-item adm-case" data-out={left <= 0 || undefined}>
              <Thumb id={m.id} />
              <span className="adm-item-name">
                {pick(m.name, locale)}
                {left <= 0 && <small>{t(ui.case.soldOut)}</small>}
              </span>
              <span className="adm-count">
                <button type="button" className="adm-round" onClick={() => demo.setStock(m.id, left - 1)} disabled={left <= 0} aria-label={`${t(ui.case.minus)}: ${pick(m.name, locale)}`}>
                  <IconMinus />
                </button>
                <b aria-live="polite">
                  {left} <small>{w(locale, "pcs", left)}</small>
                </b>
                <button type="button" className="adm-round" onClick={() => demo.setStock(m.id, left + 1)} aria-label={`${t(ui.case.plus)}: ${pick(m.name, locale)}`}>
                  <IconPlus />
                </button>
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/* ——— Лояльность ——— */

function LoyaltyTab({ locale }: { locale: Locale }) {
  const t = (l: L) => pick(l, locale);
  const { orders, events, stamps } = useCafeState();
  const issued = events.filter((e) => e.type === "stamp").length;
  const redeemed = events.filter((e) => e.type === "redeem").length;
  const rate = issued > 0 ? Math.round((redeemed / issued) * 1000) / 10 : 0;
  const stats = [
    { k: "issued" as const, text: `${issued} ${w(locale, "stamps", issued)}` },
    { k: "redeemed" as const, text: `${redeemed} ${w(locale, "cups", redeemed)}` },
    { k: "rate" as const, text: `${rate.toLocaleString(locale === "uz" ? "uz-Latn-UZ" : locale === "en" ? "en-GB" : "ru-RU")}` },
  ];
  const freeOrders = orders.filter((o) => o.free).length;
  return (
    <section aria-label={t(ui.tabs.loyalty)}>
      <p className="adm-hint">{t(ui.loyalty.hint)}</p>
      <div className="adm-stats three">
        {stats.map((s) => (
          <div key={s.k} className="adm-stat">
            <b>{s.text}</b>
            <span>{t(ui.loyalty[s.k])}</span>
          </div>
        ))}
      </div>
      <h2 className="adm-h2">{t(ui.loyalty.yours)}</h2>
      <p className="adm-stamps" role="img" aria-label={`${stamps} / ${STAMPS_GOAL}`}>
        {Array.from({ length: STAMPS_GOAL }, (_, i) => (
          <i key={i} data-filled={i < stamps || undefined} />
        ))}
        <b>
          {stamps} / {STAMPS_GOAL}
        </b>
      </p>
      <p className="adm-hint">{freeOrders > 0 ? `${freeOrders} ${w(locale, "orders", freeOrders)} · ${t(ui.orders.free)}` : ""}</p>
    </section>
  );
}

/* ——— Акция ——— */

function PromoTab({ data, locale }: { data: CafeData; locale: Locale }) {
  const t = (l: L) => pick(l, locale);
  const { promo } = useCafeState();
  const on = promo ? promo.on : true;
  const text = promo?.text?.[locale] ?? pick(data.promo, locale);
  return (
    <section aria-label={t(ui.tabs.promo)}>
      <h2 className="adm-h2">{t(ui.promo.title)}</h2>
      <label className="adm-check">
        <input type="checkbox" checked={on} onChange={(e) => demo.setPromo({ on: e.target.checked })} />
        {t(ui.promo.on)}
      </label>
      <label className="adm-field">
        <span>{t(ui.promo.text)}</span>
        <input type="text" value={text} maxLength={90} onChange={(e) => demo.setPromo({ on, text: { ...promo?.text, [locale]: e.target.value } })} />
      </label>
      <p className="adm-hint">{t(ui.promo.hint)}</p>
      {on && text && (
        <p className="adm-promo-preview" role="status">
          {text}
        </p>
      )}
    </section>
  );
}
