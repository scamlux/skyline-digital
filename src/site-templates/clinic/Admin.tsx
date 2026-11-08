"use client";

import { useEffect, useMemo, useState } from "react";
import { useHydrated, useMinuteClock } from "../kit/hooks";
import { plural } from "../kit/plural";
import { addDays, dayOfMonth, diffDays, formatDate, tashkentNow, weekdayOf } from "../kit/tashkent";
import { formatSum, pick, type L, type Locale } from "../types";
import { adminUi as ui, adminWords as words } from "./admin-ui";
import type { ClinicData } from "./data";
import { fill } from "./format";
import { buildSeedBookings } from "./seed";
import { effectiveService, toScheduleData } from "./schedule";
import { clinicUi } from "./ui";
import { demo, useClinicState, type Booking, type BookingStatus, type DemoEvent, type EventType } from "./store";

type Tab = "overview" | "bookings" | "services" | "doctors" | "promo";
const TABS: Tab[] = ["overview", "bookings", "services", "doctors", "promo"];
const ADMIN_CSS = "/templates/clinic-admin.css";
const DAY_MS = 86_400_000;
const WORK_DAYS = [0, 1, 2, 3, 4, 5];

const tag = (locale: Locale) => (locale === "uz" ? "uz-Latn-UZ" : locale === "en" ? "en-GB" : "ru-RU");

/**
 * Кабинет владельца клиники (демо). Пять экранов — Обзор, Записи, Услуги и цены, Врачи и график,
 * Акция. Всё читает и пишет демо-хранилище; тот же интерфейс в боевом сайте идёт поверх базы.
 */
export function ClinicAdmin({
  data,
  locale,
  siteHref,
  localeHrefs,
}: {
  data: ClinicData;
  locale: Locale;
  siteHref: string;
  localeHrefs: Record<Locale, string>;
}) {
  const t = (l: L) => pick(l, locale);
  const [tab, setTab] = useState<Tab>("overview");
  const state = useClinicState();
  const hydrated = useHydrated();
  const clock = useMinuteClock();
  const sched = useMemo(() => toScheduleData(data), [data]);
  const ready = hydrated && !!state.seededAt && clock > 0;

  // Пустой кабинет не показывает ничего — при первом открытии наполняем примерами. Записи с сайта
  // при этом остаются (seed сливает данные), а демо-записи ложатся на рабочие дни врачей.
  useEffect(() => {
    if (hydrated && !state.seededAt) demo.seed(buildSeedBookings(sched, { services: state.services, schedule: state.schedule }));
  }, [hydrated, state.seededAt, state.services, state.schedule, sched]);

  const svcName = (id: string) => pick(data.services.find((s) => s.id === id)?.name ?? { ru: id, en: id, uz: id }, locale);
  const docName = (id: string) => pick(data.doctors.find((d) => d.id === id)?.name ?? { ru: id, en: id, uz: id }, locale);
  const newCount = state.bookings.filter((b) => b.status === "new").length;

  return (
    <div className="adm" data-tpl="clinic" lang={locale === "uz" ? "uz-Latn" : locale}>
      <link rel="stylesheet" href={ADMIN_CSS} precedence="default" />
      <link rel="preload" href="/templates/fonts/onest-latin.woff2" as="font" type="font/woff2" crossOrigin="" />
      {locale === "ru" && <link rel="preload" href="/templates/fonts/onest-cyrillic.woff2" as="font" type="font/woff2" crossOrigin="" />}
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
            {k === "bookings" && ready && newCount > 0 && <i className="adm-dot" aria-label={t(ui.booking.status.new)} />}
          </button>
        ))}
      </nav>

      <main className="adm-main">
        {!ready && <div className="adm-skel" role="status" aria-label={t(ui.loading)} />}
        {ready && tab === "overview" && <Overview data={data} locale={locale} now={clock} bookings={state.bookings} events={state.events} svcName={svcName} docName={docName} />}
        {ready && tab === "bookings" && <Bookings locale={locale} now={clock} bookings={state.bookings} svcName={svcName} docName={docName} />}
        {ready && tab === "services" && <ServicesTab data={data} locale={locale} />}
        {ready && tab === "doctors" && <DoctorsTab data={data} locale={locale} />}
        {ready && tab === "promo" && <PromoTab data={data} locale={locale} />}
      </main>

      <footer className="adm-foot">
        <p>{t(ui.demo.text)}</p>
        <div>
          <button type="button" className="adm-link" onClick={() => demo.seed(buildSeedBookings(sched, { services: state.services, schedule: state.schedule }))}>
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

function countIn(events: DemoEvent[], type: EventType, from: number, to: number) {
  return events.filter((e) => e.type === type && Date.parse(e.at) >= from && Date.parse(e.at) < to).length;
}

function Overview({
  data,
  locale,
  now,
  bookings,
  events,
  svcName,
  docName,
}: {
  data: ClinicData;
  locale: Locale;
  now: number;
  bookings: Booking[];
  events: DemoEvent[];
  svcName: (id: string) => string;
  docName: (id: string) => string;
}) {
  const t = (l: L) => pick(l, locale);
  const week: [number, number] = [now - 7 * DAY_MS, now + 1];
  const prev: [number, number] = [now - 14 * DAY_MS, now - 7 * DAY_MS];
  const stat = (type: EventType) => {
    const cur = countIn(events, type, ...week);
    const before = countIn(events, type, ...prev);
    return { cur, delta: before > 0 ? Math.round(((cur - before) / before) * 100) : null };
  };
  const stats = (["booking", "call", "telegram", "view"] as const).map((type) => ({ k: type === "booking" ? "bookings" : type === "call" ? "calls" : type === "telegram" ? "telegram" : "views", ...stat(type) }));
  const views = stats[3].cur;
  const conv = views > 0 ? Math.round((stats[0].cur / views) * 1000) / 10 : 0;
  const calcs = countIn(events, "calc", ...week);

  // Записи по дням: последние 7 суток по Ташкенту, по дате создания записи.
  const today = tashkentNow(now).iso;
  const days = Array.from({ length: 7 }, (_, i) => addDays(today, i - 6));
  const perDay = days.map((iso) => bookings.filter((b) => tashkentNow(Date.parse(b.at)).iso === iso).length);
  const maxDay = Math.max(1, ...perDay);

  // Совет из данных: услуга и дни приёма за последние 7 суток; при <3 записях не показываем.
  const weekBookings = bookings.filter((b) => Date.parse(b.at) >= week[0] && b.status !== "cancelled");
  const bySvc = new Map<string, number>();
  weekBookings.forEach((b) => bySvc.set(b.serviceId, (bySvc.get(b.serviceId) ?? 0) + 1));
  const topSvc = [...bySvc.entries()].sort((a, b) => b[1] - a[1])[0];
  const perDow = Array.from({ length: 7 }, (_, d) => weekBookings.filter((b) => weekdayOf(b.date) === d).length);
  const peak = Math.max(...perDow);
  const peakDays = perDow.flatMap((n, d) => (n === peak && peak > 0 ? [d] : []));
  const tip =
    weekBookings.length >= 3 && topSvc
      ? peakDays.length <= 3
        ? fill(t(ui.insight.tip), { service: svcName(topSvc[0]), days: peakDays.map((d) => ui.days[locale][d]).join(", ") })
        : fill(t(ui.insight.tipNoDays), { service: svcName(topSvc[0]) })
      : null;

  const w = (k: keyof typeof words, n: number) => plural(locale, n, words[k][locale]);
  const insight = t(ui.insight.text)
    .replace("{views} {viewsW}", `${views} ${w("views", views)}`)
    .replace("{calcs} {calcsW}", `${calcs} ${w("calcs", calcs)}`)
    .replace("{calls} {callsW}", `${stats[1].cur} ${w("calls", stats[1].cur)}`)
    .replace("{telegram} {telegramW}", `${stats[2].cur} ${w("telegram", stats[2].cur)}`)
    .replace("{bookings} {bookingsW}", `${stats[0].cur} ${w("bookings", stats[0].cur)}`)
    .replace("{conv}", conv.toLocaleString(tag(locale)));

  const upcoming = sortBookings(bookings.filter((b) => b.status !== "cancelled" && b.date >= today && b.status !== "arrived" && b.status !== "noshow"));
  const next = upcoming[0];
  const nextWhen = next ? `${formatDate(next.date, locale, { weekday: "short", day: "numeric", month: "short" })}, ${next.time} · ${docName(next.doctorId)}` : t(ui.digest.none);
  const recent = [...bookings].sort((a, b) => b.at.localeCompare(a.at)).slice(0, 3);

  return (
    <section aria-label={t(ui.tabs.overview)}>
      <p className="adm-period">{t(ui.period)}</p>
      <div className="adm-stats">
        {stats.map((s) => (
          <div key={s.k} className="adm-stat">
            <b>{s.cur}</b>
            <span>{t(ui.stats[s.k as keyof typeof ui.stats])}</span>
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
        {insight}
        {tip && ` ${tip}`}
      </p>
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
      <BookingList items={recent} locale={locale} svcName={svcName} docName={docName} compact />
      <div className="adm-digest">
        <div className="adm-digest-head">
          <h2 className="adm-h2">{t(ui.digest.title)}</h2>
          <span className="adm-sample">{t(ui.digest.sample)}</span>
        </div>
        <p>{t(ui.digest.text)}</p>
        <pre>{`${data.name} · ${t(ui.digest.head)}\n${fill(t(ui.digest.line1), { n: stats[0].cur })}\n${fill(t(ui.digest.line2), { n: stats[1].cur })}\n${fill(t(ui.digest.line3), { when: nextWhen })}`}</pre>
      </div>
    </section>
  );
}

/* ——— Записи ——— */

const sortBookings = (list: Booking[]) => [...list].sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`));

function Bookings({ locale, now, bookings, svcName, docName }: { locale: Locale; now: number; bookings: Booking[]; svcName: (id: string) => string; docName: (id: string) => string }) {
  const t = (l: L) => pick(l, locale);
  const today = tashkentNow(now).iso;
  const upcoming = sortBookings(bookings.filter((b) => b.date >= today));
  const past = sortBookings(bookings.filter((b) => b.date < today)).reverse();
  const dayLabel = (iso: string) => {
    const diff = diffDays(today, iso);
    if (diff === 0) return t(ui.booking.today);
    if (diff === 1) return t(ui.booking.tomorrow);
    return formatDate(iso, locale, { weekday: "long", day: "numeric", month: "long" });
  };
  const groups: { date: string; items: Booking[] }[] = [];
  upcoming.forEach((b) => {
    const last = groups[groups.length - 1];
    if (last?.date === b.date) last.items.push(b);
    else groups.push({ date: b.date, items: [b] });
  });

  if (bookings.length === 0) return <p className="adm-empty">{t(ui.booking.empty)}</p>;
  return (
    <section aria-label={t(ui.tabs.bookings)}>
      <h2 className="adm-h2">{t(ui.booking.upcoming)}</h2>
      {groups.length === 0 && <p className="adm-empty">{t(ui.booking.noUpcoming)}</p>}
      {groups.map((g) => (
        <div key={g.date} className="adm-day">
          <h3>
            {dayLabel(g.date)}
            <small>{formatDate(g.date, locale, { day: "numeric", month: "short" })}</small>
          </h3>
          <BookingList items={g.items} locale={locale} svcName={svcName} docName={docName} />
        </div>
      ))}
      {past.length > 0 && (
        <>
          <h2 className="adm-h2">{t(ui.booking.past)}</h2>
          <BookingList items={past} locale={locale} svcName={svcName} docName={docName} showDate />
        </>
      )}
    </section>
  );
}

const NEXT_ACTIONS: Record<BookingStatus, { label: L; to: BookingStatus }[]> = {
  new: [
    { label: ui.booking.confirm, to: "confirmed" },
    { label: ui.booking.cancel, to: "cancelled" },
  ],
  confirmed: [
    { label: ui.booking.arrived, to: "arrived" },
    { label: ui.booking.noshow, to: "noshow" },
    { label: ui.booking.cancel, to: "cancelled" },
  ],
  arrived: [],
  noshow: [],
  cancelled: [{ label: ui.booking.restore, to: "confirmed" }],
};

function BookingList({
  items,
  locale,
  svcName,
  docName,
  compact,
  showDate,
}: {
  items: Booking[];
  locale: Locale;
  svcName: (id: string) => string;
  docName: (id: string) => string;
  compact?: boolean;
  showDate?: boolean;
}) {
  const t = (l: L) => pick(l, locale);
  return (
    <ul className="adm-leads">
      {items.map((b) => (
        <li key={b.id} className="adm-lead" data-status={b.status}>
          <time className="adm-time" dateTime={`${b.date}T${b.time}`}>
            <b>{b.time}</b>
            <small>{showDate || compact ? `${dayOfMonth(b.date)} ${formatDate(b.date, locale, { month: "short" })}` : ""}</small>
          </time>
          <div className="adm-lead-main">
            <b>
              {b.name}
              {b.source === "site" && <em className="adm-site">{t(ui.booking.fromSite)}</em>}
            </b>
            <span>
              {svcName(b.serviceId)} · {docName(b.doctorId)}
              {b.anyDoctor && <i> ({t(ui.booking.anyDoctor)})</i>}
            </span>
            {b.teeth && b.teeth.length > 0 ? (
              <>
                <span className="adm-teeth" role="list" aria-label={`${t(ui.booking.planLabel)}: ${t(clinicUi.jaw.teethCount).replace("{n}", String(b.teeth.length))}`}>
                  {b.teeth.map((x) => (
                    <span key={x.tooth} role="listitem">
                      <b>{x.tooth}</b> {t(clinicUi.problems[x.problem])}
                    </span>
                  ))}
                </span>
                {b.plan && <span className="adm-plan">{b.plan.replace(/\s*\([^)]*\)\s*$/, "")}</span>}
              </>
            ) : (
              b.plan && (
                <span className="adm-plan">
                  {t(ui.booking.planLabel)}: {b.plan}
                </span>
              )
            )}
            <a href={`tel:${b.phone.replace(/\s/g, "")}`}>{b.phone}</a>
          </div>
          <div className="adm-lead-side">
            <span className="adm-status">{t(ui.booking.status[b.status])}</span>
            {!compact &&
              NEXT_ACTIONS[b.status].map((n) => (
                <button key={n.to} type="button" className="adm-link" onClick={() => demo.setStatus(b.id, n.to)}>
                  {t(n.label)}
                </button>
              ))}
          </div>
        </li>
      ))}
    </ul>
  );
}

/* ——— Услуги и цены ——— */

function ServicesTab({ data, locale }: { data: ClinicData; locale: Locale }) {
  const t = (l: L) => pick(l, locale);
  const state = useClinicState();
  const ov = { services: state.services, schedule: state.schedule };
  return (
    <section aria-label={t(ui.tabs.services)}>
      <p className="adm-hint">{t(ui.services.hint)}</p>
      <ul className="adm-items">
        {data.services.map((s) => {
          const e = effectiveService(s, ov);
          return (
            <li key={s.id} className="adm-item" data-hidden={e.hidden || undefined}>
              <span className="adm-item-name">
                {t(s.name)}
                <small>
                  {t(s.unit)}
                  {e.hidden && ` · ${t(ui.services.hidden)}`}
                  {!e.calc && ""}
                </small>
              </span>
              <div className="adm-range">
                <PriceEdit id={s.id} field="min" value={e.min} base={s} locale={locale} label={`${t(s.name)}: ${t(ui.services.from)}`} saved={t(ui.services.saved)} free={t(ui.services.free)} />
                <span aria-hidden="true">–</span>
                <PriceEdit id={s.id} field="max" value={e.max} base={s} locale={locale} label={`${t(s.name)}: ${t(ui.services.to)}`} saved={t(ui.services.saved)} free={t(ui.services.free)} />
              </div>
              <button type="button" className="adm-link" onClick={() => demo.setService(s.id, { hidden: !e.hidden }, s)}>
                {e.hidden ? t(ui.services.show) : t(ui.services.hide)}
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/** Цена: клик по значению — поле ввода; Enter или потеря фокуса сохраняет. */
function PriceEdit({
  id,
  field,
  value,
  base,
  locale,
  label,
  saved,
  free,
}: {
  id: string;
  field: "min" | "max";
  value: number;
  base: { min: number; max: number };
  locale: Locale;
  label: string;
  saved: string;
  free: string;
}) {
  const [editing, setEditing] = useState(false);
  const [flash, setFlash] = useState(false);
  const commit = (raw: string) => {
    const n = Number(raw.replace(/\D/g, ""));
    if (raw.trim() !== "" && n !== value) {
      demo.setService(id, { [field]: n }, base);
      setFlash(true);
      window.setTimeout(() => setFlash(false), 1200);
    }
    setEditing(false);
  };
  const shown = value === 0 ? free : formatSum(value, locale);
  if (!editing) {
    return (
      <button type="button" className="adm-price" onClick={() => setEditing(true)} aria-label={`${label}: ${shown}`}>
        {shown}
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

/* ——— Врачи и график ——— */

function DoctorsTab({ data, locale }: { data: ClinicData; locale: Locale }) {
  const t = (l: L) => pick(l, locale);
  const state = useClinicState();
  return (
    <section aria-label={t(ui.tabs.doctors)}>
      <p className="adm-hint">{t(ui.doctors.hint)}</p>
      <ul className="adm-docs">
        {data.doctors.map((d) => {
          const days = state.schedule[d.id] ?? d.days;
          const toggle = (day: number) => demo.setDoctorDays(d.id, days.includes(day) ? days.filter((x) => x !== day) : [...days, day]);
          return (
            <li key={d.id} className="adm-doc">
              {/* eslint-disable-next-line @next/next/no-img-element -- переносимый шаблон: без next/image */}
              <img src={`/templates/clinic/img/${d.photo}-480.webp`} width={96} height={120} alt="" loading="lazy" decoding="async" />
              <div className="adm-doc-main">
                <b>{t(d.name)}</b>
                <span>{t(d.role)}</span>
                <p className="adm-days-label" id={`days-${d.id}`}>
                  {t(ui.doctors.daysLabel)}
                </p>
                <div className="adm-days" role="group" aria-labelledby={`days-${d.id}`}>
                  {ui.days[locale].map((label, day) =>
                    WORK_DAYS.includes(day) ? (
                      <button key={day} type="button" aria-pressed={days.includes(day)} onClick={() => toggle(day)}>
                        {label}
                      </button>
                    ) : (
                      <button key={day} type="button" disabled title={t(ui.doctors.sunday)} aria-label={`${label}: ${t(ui.doctors.sunday)}`}>
                        {label}
                      </button>
                    ),
                  )}
                </div>
                {days.filter((x) => WORK_DAYS.includes(x)).length === 0 && <p className="adm-warn">{t(ui.doctors.noDays)}</p>}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/* ——— Акция ——— */

function PromoTab({ data, locale }: { data: ClinicData; locale: Locale }) {
  const t = (l: L) => pick(l, locale);
  const state = useClinicState();
  return (
    <section aria-label={t(ui.tabs.promo)}>
      <h2 className="adm-h2">{t(ui.promo.title)}</h2>
      <label className="adm-check">
        <input type="checkbox" checked={state.promo?.on ?? true} onChange={(e) => demo.setPromo({ on: e.target.checked })} />
        {t(ui.promo.on)}
      </label>
      <label className="adm-field">
        {t(ui.promo.text)}
        <input
          type="text"
          value={state.promo?.text?.[locale] ?? t(data.promo)}
          onChange={(e) => demo.setPromo({ on: state.promo?.on ?? true, text: { ...state.promo?.text, [locale]: e.target.value } })}
        />
      </label>
      <p className="adm-hint">{t(ui.promo.hint)}</p>
    </section>
  );
}
