"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { formatSum, pick, type Locale, type L } from "../types";
import type { RestaurantData } from "./data";
import { adminUi as ui } from "./admin-ui";
import { plural, words } from "./plural";
import { demo, useDemoState, type Lead, type LeadStatus } from "./store";

type Tab = "overview" | "leads" | "menu" | "settings";
const DAY = 86_400_000;
const ADMIN_CSS = "/templates/restaurant-admin.css";

/** Заявки, которыми наполняем демо: имена вымышленные. */
const SEED_LEADS = [
  { name: "Дилноза", phone: "+998 90 111 22 33", when: "", guests: "4" },
  { name: "Акмаль", phone: "+998 97 222 33 44", when: "", guests: "2" },
  { name: "Малика", phone: "+998 93 333 44 55", when: "", guests: "6" },
  { name: "Jasur", phone: "+998 94 444 55 66", when: "", guests: "3" },
  { name: "Нигора", phone: "+998 99 555 66 77", when: "", guests: "2" },
  { name: "Bobur", phone: "+998 91 666 77 88", when: "", guests: "8" },
  { name: "Севара", phone: "+998 95 777 88 99", when: "", guests: "2" },
  { name: "Farrux", phone: "+998 90 888 99 00", when: "", guests: "5" },
];

/** Демо-заявки с датами «в ближайшие дни, вечером» — считаются в момент нажатия. */
const seedLeads = () =>
  SEED_LEADS.map((l, i) => {
    // Бронь на ближайшие дни, ровно на 19:00 по местному времени.
    const d = new Date();
    d.setDate(d.getDate() + (i % 3));
    d.setHours(19, 0, 0, 0);
    const p = (n: number) => String(n).padStart(2, "0");
    return { ...l, when: `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T19:00` };
  });

/** Название дня недели (0 = понедельник) на языке кабинета. */
function weekdayName(dow: number, locale: Locale) {
  return new Date(2024, 0, 1 + dow).toLocaleDateString(locale === "uz" ? "uz-Latn-UZ" : locale === "en" ? "en-GB" : "ru-RU", { weekday: "long" });
}

function fmtWhen(iso: string, locale: Locale) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(locale === "uz" ? "uz-Latn-UZ" : locale === "en" ? "en-GB" : "ru-RU", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Кабинет владельца (демо). Четыре экрана — Обзор, Заявки, Меню и цены, Часы и акция.
 * Всё читает и пишет демо-хранилище; тот же интерфейс в боевом сайте идёт поверх базы.
 */
export function RestaurantAdmin({
  data,
  locale,
  siteHref,
  localeHrefs,
}: {
  data: RestaurantData;
  locale: Locale;
  siteHref: string;
  localeHrefs: Record<Locale, string>;
}) {
  const t = (l: L) => pick(l, locale);
  const [tab, setTab] = useState<Tab>("overview");
  const state = useDemoState();
  // false на сервере и при гидрации, true после — без setState в эффекте.
  const hydrated = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  // Пустой кабинет не показывает ничего — при первом открытии наполняем примерами.
  useEffect(() => {
    // Наполняем, пока демо ни разу не заполняли; заявки с сайта при этом остаются (seed сливает данные).
    if (hydrated && !state.seededAt) demo.seed(seedLeads());
  }, [hydrated, state.seededAt]);

  // «Сейчас» пересчитываем при каждом изменении состояния: окно «7 дней» должно видеть свежие события.
  // eslint-disable-next-line react-hooks/purity -- время нужно кабинету именно на момент рендера
  const now = Date.now();
  const inRange = (at: string, from: number, to: number) => {
    const ts = new Date(at).getTime();
    return ts >= from && ts < to;
  };
  const count = (type: string, from: number, to: number) => state.events.filter((e) => e.type === type && inRange(e.at, from, to)).length;
  const week = [now - 7 * DAY, now] as const;
  const prev = [now - 14 * DAY, now - 7 * DAY] as const;
  const stats = (["leads", "calls", "telegram", "views"] as const).map((k) => {
    const type = k === "leads" ? "lead" : k === "calls" ? "call" : k === "telegram" ? "telegram" : "view";
    const cur = count(type, ...week);
    const before = count(type, ...prev);
    return { k, cur, delta: before ? Math.round(((cur - before) / before) * 100) : null };
  });
  const views = stats[3].cur;
  const conv = views ? Math.round((stats[0].cur / views) * 1000) / 10 : 0;
  const byDay = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now - (6 - i) * DAY);
    const start = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    return { dow: (d.getDay() + 6) % 7, n: count("lead", start, start + DAY) };
  });
  const maxDay = Math.max(1, ...byDay.map((d) => d.n));
  // Совет считается из заявок за 7 дней: дни недели с максимумом; мало данных — не показываем.
  const weekLeads = state.leads.filter((l) => inRange(l.at, week[0], week[1]));
  const perDow = Array.from({ length: 7 }, (_, dow) => weekLeads.filter((l) => (new Date(l.at).getDay() + 6) % 7 === dow).length);
  const peak = Math.max(...perDow);
  const topDays = perDow.flatMap((n, dow) => (n === peak && peak > 0 ? [dow] : []));
  const tip = weekLeads.length >= 3 && topDays.length <= 3 ? t(ui.insight.tip).replace("{days}", topDays.map((d) => weekdayName(d, locale)).join(", ")) : null;
  const countText = (k: "views" | "calls" | "telegram" | "leads", n: number) => `${n} ${plural(locale, n, words[k][locale])}`;

  const tabs: Tab[] = ["overview", "leads", "menu", "settings"];

  return (
    <div className="adm" data-tpl="restaurant" data-style="a">
      <link rel="stylesheet" href={ADMIN_CSS} precedence="default" />
      <header className="adm-head">
        <div>
          <span className="adm-badge">{t(ui.demo.badge)}</span>
          <strong className="adm-name">{data.name}</strong>
        </div>
        <nav className="adm-lang" aria-label="Language">
          {(["ru", "en", "uz"] as Locale[]).map((l) => (
            <a key={l} href={localeHrefs[l]} aria-current={l === locale ? "true" : undefined}>
              {l.toUpperCase()}
            </a>
          ))}
        </nav>
        <a className="adm-btn ghost" href={siteHref} target="_blank" rel="noopener">
          {t(ui.openSite)} ↗
        </a>
      </header>

      <nav className="adm-tabs" aria-label={t(ui.title)}>
        {tabs.map((k) => (
          <button key={k} type="button" aria-current={tab === k ? "page" : undefined} onClick={() => setTab(k)}>
            {t(ui.tabs[k])}
            {k === "leads" && hydrated && state.leads.some((l) => l.status === "new") && (
              <i className="adm-dot" aria-label={t(ui.lead.status.new)} />
            )}
          </button>
        ))}
      </nav>

      <main className="adm-main">
        {tab === "overview" && (
          <section aria-label={t(ui.tabs.overview)}>
            <p className="adm-period">{t(ui.period)}</p>
            <div className="adm-stats">
              {stats.map((s) => (
                <div key={s.k} className="adm-stat">
                  <b>{hydrated ? s.cur : "—"}</b>
                  <span>{t(ui.stats[s.k])}</span>
                  {hydrated && s.delta !== null && (
                    <em data-up={s.delta >= 0 || undefined}>
                      {s.delta >= 0 ? "+" : ""}
                      {s.delta}% {t(ui.vsPrev)}
                    </em>
                  )}
                </div>
              ))}
            </div>
            {hydrated && (
              <p className="adm-insight">
                {t(ui.insight.text)
                  .replace("{views} {viewsW}", countText("views", views))
                  .replace("{calls} {callsW}", countText("calls", stats[1].cur))
                  .replace("{telegram} {telegramW}", countText("telegram", stats[2].cur))
                  .replace("{leads} {leadsW}", countText("leads", stats[0].cur))
                  .replace("{conv}", conv.toLocaleString(locale === "uz" ? "uz-Latn-UZ" : locale === "en" ? "en-GB" : "ru-RU"))}
                {tip && ` ${tip}`}
              </p>
            )}
            <h2 className="adm-h2">{t(ui.byDay)}</h2>
            <div className="adm-bars" role="img" aria-label={t(ui.byDay)}>
              {byDay.map((d, i) => (
                <div key={i} className="adm-bar">
                  <b style={{ height: `${Math.max(6, (d.n / maxDay) * 100)}%` }} data-n={d.n} />
                  <span>{ui.days[locale][d.dow]}</span>
                </div>
              ))}
            </div>
            <h2 className="adm-h2">{t(ui.recent)}</h2>
            <LeadList leads={state.leads.slice(0, 3)} locale={locale} t={t} compact />
            <div className="adm-digest">
              <h2 className="adm-h2">{t(ui.digest.title)}</h2>
              <p>{t(ui.digest.text)}</p>
              <pre>
                {`📊 ${data.name} · ${t(ui.period).toLowerCase()}\n` +
                  `• ${t(ui.stats.leads)}: ${stats[0].cur}\n` +
                  `• ${t(ui.stats.calls)}: ${stats[1].cur}\n` +
                  `• ${t(ui.stats.telegram)}: ${stats[2].cur}\n` +
                  `• ${t(ui.stats.views)}: ${views}` +
                  (tip ? `\n💡 ${tip}` : "")}
              </pre>
            </div>
          </section>
        )}

        {tab === "leads" && (
          <section aria-label={t(ui.tabs.leads)}>
            {state.leads.length === 0 ? <p className="adm-empty">{t(ui.lead.empty)}</p> : <LeadList leads={state.leads} locale={locale} t={t} />}
          </section>
        )}

        {tab === "menu" && (
          <section aria-label={t(ui.tabs.menu)}>
            <p className="adm-hint">{t(ui.menu.hint)}</p>
            {data.menu.map((c) => (
              <div key={c.id} className="adm-cat">
                <h2 className="adm-h2">{t(c.title)}</h2>
                <ul className="adm-items">
                  {c.items.map((it) => {
                    const o = state.items[it.id] ?? {};
                    const price = o.price ?? it.price;
                    const avail = o.available ?? it.available !== false;
                    return (
                      <li key={it.id} className="adm-item" data-hidden={o.hidden || undefined} data-out={!avail || undefined}>
                        <span className="adm-item-name">
                          {t(it.name)}
                          {o.hidden && <small> · {t(ui.menu.hidden)}</small>}
                        </span>
                        <PriceEdit id={it.id} value={price} locale={locale} label={t(ui.menu.price)} saved={t(ui.menu.saved)} />
                        <button
                          type="button"
                          className="adm-toggle"
                          role="switch"
                          aria-checked={avail}
                          onClick={() => demo.setItem(it.id, { available: !avail })}
                        >
                          <i aria-hidden="true" />
                          {avail ? t(ui.menu.inStock) : t(ui.menu.out)}
                        </button>
                        <button type="button" className="adm-link" onClick={() => demo.setItem(it.id, { hidden: !o.hidden })}>
                          {o.hidden ? t(ui.menu.show) : t(ui.menu.hide)}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </section>
        )}

        {tab === "settings" && (
          <section aria-label={t(ui.tabs.settings)}>
            <h2 className="adm-h2">{t(ui.settings.hours)}</h2>
            <div className="adm-row">
              <label>
                {t(ui.settings.open)}
                <input type="time" value={state.hours?.open ?? data.hours.open} onChange={(e) => demo.setHours({ open: e.target.value, close: state.hours?.close ?? data.hours.close })} />
              </label>
              <label>
                {t(ui.settings.close)}
                <input type="time" value={state.hours?.close ?? data.hours.close} onChange={(e) => demo.setHours({ open: state.hours?.open ?? data.hours.open, close: e.target.value })} />
              </label>
            </div>
            <p className="adm-hint">{t(ui.settings.hint)}</p>
            <h2 className="adm-h2">{t(ui.settings.promo)}</h2>
            <label className="adm-check">
              <input type="checkbox" checked={state.promo?.on ?? true} onChange={(e) => demo.setPromo({ on: e.target.checked })} />
              {t(ui.settings.promoOn)}
            </label>
            <label className="adm-field">
              {t(ui.settings.promoText)}
              <input
                type="text"
                value={state.promo?.text?.[locale] ?? t(data.promo)}
                onChange={(e) => demo.setPromo({ on: state.promo?.on ?? true, text: { ...state.promo?.text, [locale]: e.target.value } })}
              />
            </label>
          </section>
        )}
      </main>

      <footer className="adm-foot">
        <p>{t(ui.demo.text)}</p>
        <div>
          <button type="button" className="adm-link" onClick={() => demo.seed(seedLeads())}>
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

function LeadList({ leads, locale, t, compact }: { leads: Lead[]; locale: Locale; t: (l: L) => string; compact?: boolean }) {
  const next: Record<LeadStatus, { label: L; to: LeadStatus }[]> = {
    new: [
      { label: ui.lead.confirm, to: "confirmed" },
      { label: ui.lead.cancel, to: "cancelled" },
    ],
    confirmed: [
      { label: ui.lead.seated, to: "done" },
      { label: ui.lead.cancel, to: "cancelled" },
    ],
    done: [],
    cancelled: [{ label: ui.lead.confirm, to: "confirmed" }],
  };
  return (
    <ul className="adm-leads">
      {leads.map((l) => (
        <li key={l.id} className="adm-lead" data-status={l.status}>
          <div className="adm-lead-main">
            <b>{l.name}</b>
            <span>
              {fmtWhen(l.when, locale)} · {l.guests} {t(ui.lead.guests)}
            </span>
            <a href={`tel:${l.phone.replace(/\s/g, "")}`}>{l.phone}</a>
          </div>
          <div className="adm-lead-side">
            <span className="adm-status">{t(ui.lead.status[l.status])}</span>
            {!compact && next[l.status].map((n) => (
              <button key={n.to} type="button" className="adm-link" onClick={() => demo.setLeadStatus(l.id, n.to)}>
                {t(n.label)}
              </button>
            ))}
          </div>
        </li>
      ))}
    </ul>
  );
}

/** Цена: клик по значению — поле ввода; Enter или потеря фокуса — сохраняет. */
function PriceEdit({ id, value, locale, label, saved }: { id: string; value: number; locale: Locale; label: string; saved: string }) {
  const [editing, setEditing] = useState(false);
  const [flash, setFlash] = useState(false);
  const commit = (raw: string) => {
    const n = Number(raw.replace(/\D/g, ""));
    if (n > 0 && n !== value) {
      demo.setItem(id, { price: n });
      setFlash(true);
      window.setTimeout(() => setFlash(false), 1200);
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
