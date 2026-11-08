"use client";

import { useEffect, useState } from "react";
import { useHydrated, useMinuteClock } from "../kit/hooks";
import { plural } from "../kit/plural";
import { formatDate, tashkentNow } from "../kit/tashkent";
import { formatSum, pick, type L, type Locale } from "../types";
import { MenuTab } from "./admin-menu";
import { adminUi as ui, adminWords } from "./admin-ui";
import type { RestaurantData } from "./data";
import { buildSeedLeads } from "./seed";
import { leadsPerDay, peakWeekdays, weekStats } from "./stats";
import { demo, useDemoState, type Lead, type LeadStatus } from "./store";

type Tab = "overview" | "leads" | "menu" | "settings";
const TABS: Tab[] = ["overview", "leads", "menu", "settings"];
const ADMIN_CSS = "/templates/restaurant-admin.css";
const FONT_PRELOADS = { ru: ["/templates/fonts/onest-latin.woff2", "/templates/fonts/onest-cyrillic.woff2"], en: ["/templates/fonts/onest-latin.woff2"], uz: ["/templates/fonts/onest-latin.woff2"] } as const;
const RECENT_LEADS = 3;
const LEADS_LOCALE_TAG = { ru: "ru-RU", en: "en-GB", uz: "uz-Latn-UZ" } as const;

/** Название дня недели (0 = понедельник) на языке кабинета. */
const weekdayName = (dow: number, locale: Locale) => formatDate(`2024-01-0${1 + dow}`, locale, { weekday: "long" });

/**
 * Кабинет владельца (демо). Четыре экрана: Обзор, Заявки, Меню и цены (с наборами «на компанию»),
 * Часы и акция. Всё читает и пишет демо-хранилище; тот же интерфейс в боевом сайте идёт поверх базы.
 */
export function RestaurantAdmin({ data, locale, siteHref, localeHrefs }: { data: RestaurantData; locale: Locale; siteHref: string; localeHrefs: Record<Locale, string> }) {
  const t = (l: L) => pick(l, locale);
  const [tab, setTab] = useState<Tab>("overview");
  const state = useDemoState();
  const hydrated = useHydrated();
  const clock = useMinuteClock();

  // Пустой кабинет не показывает ничего — при первом открытии наполняем примерами.
  // Заявки с сайта при этом остаются (seed сливает данные).
  useEffect(() => {
    if (hydrated && !state.seededAt) demo.seed(buildSeedLeads(tashkentNow().iso));
  }, [hydrated, state.seededAt]);

  const ready = hydrated && clock > 0;
  const newCount = state.leads.filter((l) => l.status === "new").length;

  return (
    <div className="adm" data-tpl="restaurant" lang={locale === "uz" ? "uz-Latn" : locale}>
      <link rel="stylesheet" href={ADMIN_CSS} precedence="default" />
      {FONT_PRELOADS[locale].map((href) => (
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

      <nav className="adm-tabs" aria-label={t(ui.title)}>
        {TABS.map((k) => (
          <button key={k} type="button" aria-current={tab === k ? "page" : undefined} onClick={() => setTab(k)}>
            {t(ui.tabs[k])}
            {k === "leads" && ready && newCount > 0 && <i className="adm-dot" aria-label={t(ui.lead.status.new)} />}
          </button>
        ))}
      </nav>

      <main className="adm-main">
        {!ready && <div className="adm-skel" role="status" aria-label={t(ui.loading)} />}
        {ready && tab === "overview" && <Overview data={data} locale={locale} now={clock} />}
        {ready && tab === "leads" && (
          <section aria-label={t(ui.tabs.leads)}>
            {state.leads.length === 0 ? <p className="adm-hint">{t(ui.lead.empty)}</p> : <LeadList leads={state.leads} locale={locale} />}
          </section>
        )}
        {ready && tab === "menu" && <MenuTab menu={data.menu} sets={data.sets} locale={locale} />}
        {ready && tab === "settings" && <Settings data={data} locale={locale} />}
      </main>

      <footer className="adm-foot">
        <p>{t(ui.demo.text)}</p>
        <div>
          <button type="button" className="adm-link" onClick={() => demo.seed(buildSeedLeads(tashkentNow().iso))}>
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

function Overview({ data, locale, now }: { data: RestaurantData; locale: Locale; now: number }) {
  const t = (l: L) => pick(l, locale);
  const state = useDemoState();
  const stats = weekStats(state.events, now);
  const byDay = leadsPerDay(state.events, now);
  const maxDay = Math.max(1, ...byDay.map((d) => d.n));
  const get = (k: string) => stats.find((s) => s.k === k)!.cur;
  const views = get("views");
  const conv = views ? Math.round((get("leads") / views) * 1000) / 10 : 0;
  const peak = peakWeekdays(state.leads, now);
  const tip = peak.length > 0 ? t(ui.insight.tip).replace("{days}", peak.map((d) => weekdayName(d, locale)).join(", ")) : null;
  const countText = (k: "views" | "calls" | "telegram" | "leads", n: number) => `${n} ${plural(locale, n, adminWords[k][locale])}`;
  const sorted = [...state.leads].sort((a, b) => b.at.localeCompare(a.at)).slice(0, RECENT_LEADS);

  return (
    <section aria-label={t(ui.tabs.overview)}>
      <p className="adm-period">{t(ui.period)}</p>
      <div className="adm-stats">
        {stats.map((s) => (
          <div key={s.k} className="adm-stat">
            <b>{s.cur}</b>
            <span>{t(ui.stats[s.k])}</span>
            {s.delta !== null && (
              <em data-up={s.delta >= 0 || undefined}>
                {s.delta >= 0 ? "+" : ""}
                {s.delta}% {t(ui.vsPrev)}
              </em>
            )}
          </div>
        ))}
      </div>
      <p className="adm-insight">
        {t(ui.insight.text)
          .replace("{views} {viewsW}", countText("views", views))
          .replace("{calls} {callsW}", countText("calls", get("calls")))
          .replace("{telegram} {telegramW}", countText("telegram", get("telegram")))
          .replace("{leads} {leadsW}", countText("leads", get("leads")))
          .replace("{conv}", conv.toLocaleString(LEADS_LOCALE_TAG[locale]))}
        {tip && ` ${tip}`}
      </p>
      <h2 className="adm-h2">{t(ui.byDay)}</h2>
      <div className="adm-bars" role="img" aria-label={t(ui.byDay)}>
        {byDay.map((d) => (
          <div key={d.iso} className="adm-bar">
            <b style={{ height: `${Math.max(6, (d.n / maxDay) * 100)}%` }} data-n={d.n} />
            <span>{ui.days[locale][d.weekday]}</span>
          </div>
        ))}
      </div>
      <h2 className="adm-h2">{t(ui.recent)}</h2>
      <LeadList leads={sorted} locale={locale} compact />
      <div className="adm-digest">
        <h2 className="adm-h2">{t(ui.digest.title)}</h2>
        <p className="adm-hint">{t(ui.digest.text)}</p>
        <pre>
          {`${data.name} · ${t(ui.period).toLowerCase()}\n` +
            `• ${t(ui.stats.leads)}: ${get("leads")}\n` +
            `• ${t(ui.stats.calls)}: ${get("calls")}\n` +
            `• ${t(ui.stats.telegram)}: ${get("telegram")}\n` +
            `• ${t(ui.stats.views)}: ${views}` +
            (tip ? `\n${tip}` : "")}
        </pre>
      </div>
    </section>
  );
}

const NEXT: Record<LeadStatus, { label: L; to: LeadStatus }[]> = {
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

function LeadList({ leads, locale, compact }: { leads: Lead[]; locale: Locale; compact?: boolean }) {
  const t = (l: L) => pick(l, locale);
  return (
    <ul className="adm-leads">
      {leads.map((l) => {
        const [date, time] = l.when.split("T");
        return (
          <li key={l.id} className="adm-lead" data-status={l.status} data-lead={l.id}>
            <time className="adm-time" dateTime={l.when || undefined}>
              <b>{time ?? "—"}</b>
              <small>{date ? formatDate(date, locale, { weekday: "short", day: "numeric", month: "short" }) : t(ui.lead.noTime)}</small>
            </time>
            <div className="adm-lead-main">
              <b>
                {l.name}
                {l.source === "site" && <em className="adm-site">{t(ui.lead.fromSite)}</em>}
              </b>
              <span>
                {l.guests} {t(ui.lead.guests)}
              </span>
              {(l.zone || l.occasion) && (
                <span className="adm-tags">
                  {l.zone && <em data-zone={l.zone}>{t(ui.zones[l.zone])}</em>}
                  {l.occasion && <em data-occasion={l.occasion}>{t(ui.occasions[l.occasion])}</em>}
                </span>
              )}
              {l.wish && (
                <span className="adm-wish">
                  <small>{t(ui.lead.wish)}:</small> {l.wish}
                  {l.wishSum ? ` · ${formatSum(l.wishSum, locale)}` : ""}
                </span>
              )}
              <a className="adm-phone" href={`tel:${l.phone.replace(/\s/g, "")}`}>
                {l.phone}
              </a>
            </div>
            <div className="adm-lead-side">
              <span className="adm-pill">{t(ui.lead.status[l.status])}</span>
              {!compact && (
                <span className="adm-actions">
                  {NEXT[l.status].map((n) => (
                    <button key={n.to} type="button" className="adm-link" onClick={() => demo.setLeadStatus(l.id, n.to)}>
                      {t(n.label)}
                    </button>
                  ))}
                </span>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function Settings({ data, locale }: { data: RestaurantData; locale: Locale }) {
  const t = (l: L) => pick(l, locale);
  const state = useDemoState();
  const hours = state.hours ?? data.hours;
  return (
    <section aria-label={t(ui.tabs.settings)}>
      <h2 className="adm-h2">{t(ui.settings.hours)}</h2>
      <div className="adm-row">
        <label>
          {t(ui.settings.open)}
          <input type="time" value={hours.open} onChange={(e) => e.target.value && demo.setHours({ open: e.target.value, close: hours.close })} />
        </label>
        <label>
          {t(ui.settings.close)}
          <input type="time" value={hours.close} onChange={(e) => e.target.value && demo.setHours({ open: hours.open, close: e.target.value })} />
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
        <input type="text" value={state.promo?.text?.[locale] ?? t(data.promo)} onChange={(e) => demo.setPromo({ on: state.promo?.on ?? true, text: { ...state.promo?.text, [locale]: e.target.value } })} />
      </label>
    </section>
  );
}
