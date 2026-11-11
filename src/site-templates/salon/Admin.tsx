"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useHydrated, useMinuteClock } from "../kit/hooks";
import { DigestTelegramButton, digestCopy } from "../kit/digest-button";
import { itemCode } from "../kit/digest-payload";
import { plural } from "../kit/plural";
import { addDays, dayOfMonth, diffDays, formatDate, tashkentNow, weekdayOf } from "../kit/tashkent";
import { formatSum, pick, type L, type Locale } from "../types";
import { adminUi as ui, adminWords as words } from "./admin-ui";
import type { SalonData } from "./data";
import type { StyleId } from "../types";
import { fill, formatMinutes } from "./format";
import { buildSeedBookings, GUESTS_MEN, GUESTS_WOMEN } from "./seed";
import { basketOf, effectiveService, masterDays, packagePct, toScheduleData } from "./schedule";
import { lastStyle, salonStores, type Booking, type BookingStatus, type DemoEvent, type EventType, type SalonStore } from "./store";

type Tab = "overview" | "bookings" | "services" | "masters" | "promo";
const TABS: Tab[] = ["overview", "bookings", "services", "masters", "promo"];
const ADMIN_CSS = "/templates/salon-admin.css";
const DAY_MS = 86_400_000;
const WEEK = 7;

const tag = (locale: Locale) => (locale === "uz" ? "uz-Latn-UZ" : locale === "en" ? "en-GB" : "ru-RU");

/**
 * Кабинет владельца салона (демо). Пять экранов — Обзор, Записи, Услуги и цены, Мастера и график,
 * Акция. Всё читает и пишет демо-хранилище; тот же интерфейс в боевом сайте идёт поверх базы.
 */
/** Шум демо-событий у каждого бизнеса свой: просмотры и звонки в двух кабинетах не совпадают. */
const SEED_SALT: Record<StyleId, number> = { a: 17, b: 29 };

const StoreCtx = createContext<SalonStore>(salonStores.a);

/** Хранилище того бизнеса, который сейчас открыт в кабинете. */
function useAdminStore() {
  const store = useContext(StoreCtx);
  return { state: store.useState(), demo: store.demo };
}

interface AdminProps {
  businesses: Record<StyleId, SalonData>;
  locale: Locale;
  siteHref: string;
  localeHrefs: Record<Locale, string>;
  /** Имя бота сводок без «@»: без него блок «Сводка в Telegram» остаётся превью без кнопки. */
  digestBot?: string;
}

/**
 * Кабинет владельца (демо) для двух бизнесов сразу: наверху переключатель «Барбершоп / Салон
 * красоты». У каждого свои записи, цены, мастера и акция; запись с /a попадает в барбершоп, с /b в
 * салон. Открывается на том бизнесе, который смотрели последним.
 */
export function SalonAdmin({ businesses, locale, siteHref, localeHrefs, digestBot }: AdminProps) {
  const hydrated = useHydrated();
  const [chosen, setChosen] = useState<StyleId | null>(null);
  const style: StyleId = chosen ?? (hydrated ? lastStyle() : "a");
  const t = (l: L) => pick(l, locale);
  return (
    <StoreCtx.Provider value={salonStores[style]}>
      <BusinessAdmin key={style} data={businesses[style]} style={style} locale={locale} siteHref={siteHref.replace(/\/[ab]$/, `/${style}`)} localeHrefs={localeHrefs} digestBot={digestBot}>
        <div className="adm-switch" role="group" aria-label={t(ui.switch.label)}>
          {(["a", "b"] as StyleId[]).map((k) => (
            <button key={k} type="button" aria-pressed={style === k} onClick={() => setChosen(k)}>
              {t(ui.switch[k])}
            </button>
          ))}
        </div>
      </BusinessAdmin>
    </StoreCtx.Provider>
  );
}

function BusinessAdmin({ data, style, locale, siteHref, localeHrefs, digestBot, children }: { data: SalonData; style: StyleId; locale: Locale; siteHref: string; localeHrefs: Record<Locale, string>; digestBot?: string; children: React.ReactNode }) {
  const t = (l: L) => pick(l, locale);
  const [tab, setTab] = useState<Tab>("overview");
  const { state, demo } = useAdminStore();
  const hydrated = useHydrated();
  const clock = useMinuteClock();
  const sched = useMemo(() => toScheduleData(data), [data]);
  const ov = useMemo(() => ({ services: state.services, schedule: state.schedule, packages: state.packages }), [state.services, state.schedule, state.packages]);
  const guests = style === "b" ? GUESTS_WOMEN : GUESTS_MEN;
  const ready = hydrated && !!state.seededAt && clock > 0;

  // Пустой кабинет не показывает ничего — при первом открытии наполняем примерами. Записи с сайта
  // при этом остаются (seed сливает данные), а демо-записи ложатся на рабочие дни мастеров.
  useEffect(() => {
    if (hydrated && !state.seededAt) demo.seed(buildSeedBookings(sched, ov, Date.now(), guests), SEED_SALT[style]);
  }, [hydrated, state.seededAt, sched, ov, demo, guests, style]);

  const svcName = (id: string) => pick(data.services.find((s) => s.id === id)?.name ?? { ru: id, en: id, uz: id }, locale);
  const masterName = (id: string) => pick(data.masters.find((m) => m.id === id)?.name ?? { ru: id, en: id, uz: id }, locale);
  const newCount = state.bookings.filter((b) => b.status === "new").length;
  const names = { svc: svcName, master: masterName };

  return (
    <div className="adm" data-tpl="salon" data-style={style} lang={locale === "uz" ? "uz-Latn" : locale}>
      <link rel="stylesheet" href={ADMIN_CSS} precedence="default" />
      <link rel="preload" href="/templates/fonts/onest-latin.woff2" as="font" type="font/woff2" crossOrigin="" />
      <link rel="preload" href="/templates/fonts/onest-cyrillic.woff2" as="font" type="font/woff2" crossOrigin="" />
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

      <div className="adm-biz">{children}</div>

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
        {ready && tab === "overview" && <Overview data={data} style={style} locale={locale} now={clock} bookings={state.bookings} events={state.events} names={names} digestBot={digestBot} />}
        {ready && tab === "bookings" && <Bookings locale={locale} now={clock} bookings={state.bookings} names={names} />}
        {ready && tab === "services" && <ServicesTab data={data} locale={locale} />}
        {ready && tab === "masters" && <MastersTab data={data} locale={locale} />}
        {ready && tab === "promo" && <PromoTab data={data} locale={locale} />}
      </main>

      <footer className="adm-foot">
        <p>{t(ui.demo.text)}</p>
        <div>
          <button type="button" className="adm-link" onClick={() => demo.seed(buildSeedBookings(sched, ov, Date.now(), guests), SEED_SALT[style])}>
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

interface Names {
  svc: (id: string) => string;
  master: (id: string) => string;
}

/* ——— Обзор ——— */

const countIn = (events: DemoEvent[], type: EventType, from: number, to: number) => events.filter((e) => e.type === type && Date.parse(e.at) >= from && Date.parse(e.at) < to).length;

/** Самый частый ключ и его счёт; при равенстве первый по порядку появления. */
function topOf(keys: string[]): [string, number] | null {
  const counts = new Map<string, number>();
  keys.forEach((k) => counts.set(k, (counts.get(k) ?? 0) + 1));
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0] ?? null;
}

function Overview({ data, style, locale, now, bookings, events, names, digestBot }: { data: SalonData; style: StyleId; locale: Locale; now: number; bookings: Booking[]; events: DemoEvent[]; names: Names; digestBot?: string }) {
  const t = (l: L) => pick(l, locale);
  const week: [number, number] = [now - WEEK * DAY_MS, now + 1];
  const prev: [number, number] = [now - 2 * WEEK * DAY_MS, now - WEEK * DAY_MS];
  const delta = (cur: number, before: number) => (before > 0 ? Math.round(((cur - before) / before) * 100) : null);

  const inWeek = (list: Booking[], [a, b]: [number, number]) => list.filter((x) => x.status !== "cancelled" && Date.parse(x.at) >= a && Date.parse(x.at) < b);
  const curBookings = inWeek(bookings, week);
  const prevBookings = inWeek(bookings, prev);
  const sum = (list: Booking[]) => list.reduce((s, x) => s + x.total, 0);
  const evStat = (type: EventType) => ({ cur: countIn(events, type, ...week), before: countIn(events, type, ...prev) });
  const views = evStat("view");
  const telegram = evStat("telegram");
  const calls = countIn(events, "call", ...week);
  const quizzes = countIn(events, "quiz", ...week);

  const stats = [
    { k: "bookings" as const, text: String(curBookings.length), delta: delta(curBookings.length, prevBookings.length) },
    { k: "revenue" as const, text: formatSum(sum(curBookings), locale), delta: delta(sum(curBookings), sum(prevBookings)) },
    { k: "telegram" as const, text: String(telegram.cur), delta: delta(telegram.cur, telegram.before) },
    { k: "views" as const, text: String(views.cur), delta: delta(views.cur, views.before) },
  ];
  const conv = views.cur > 0 ? Math.round((curBookings.length / views.cur) * 1000) / 10 : 0;

  // Записи по дням: последние 7 суток по Ташкенту, по дате создания записи.
  const today = tashkentNow(now).iso;
  const days = Array.from({ length: WEEK }, (_, i) => addDays(today, i - (WEEK - 1)));
  const perDay = days.map((iso) => bookings.filter((b) => b.status !== "cancelled" && tashkentNow(Date.parse(b.at)).iso === iso).length);
  const maxDay = Math.max(1, ...perDay);

  // Совет из данных: самая частая услуга и самый загруженный мастер за неделю; при <3 записях не показываем.
  const topSvc = topOf(curBookings.flatMap((b) => b.serviceIds));
  const topMaster = topOf(curBookings.map((b) => b.masterId));
  const tip =
    curBookings.length >= 3 && topSvc
      ? topMaster
        ? fill(t(ui.insight.tip), { service: names.svc(topSvc[0]), master: names.master(topMaster[0]), n: topMaster[1] })
        : fill(t(ui.insight.tipOnlyService), { service: names.svc(topSvc[0]) })
      : null;

  const w = (k: keyof typeof words, n: number) => plural(locale, n, words[k][locale]);
  const insight = t(ui.insight.text)
    .replace("{views} {viewsW}", `${views.cur} ${w("views", views.cur)}`)
    .replace("{quizzes} {quizzesW}", `${quizzes} ${w("quizzes", quizzes)}`)
    .replace("{calls} {callsW}", `${calls} ${w("calls", calls)}`)
    .replace("{telegram} {telegramW}", `${telegram.cur} ${w("telegram", telegram.cur)}`)
    .replace("{bookings} {bookingsW}", `${curBookings.length} ${w("bookings", curBookings.length)}`)
    .replace("{conv}", conv.toLocaleString(tag(locale)));

  const upcoming = sortBookings(bookings.filter((b) => b.date >= today && (b.status === "new" || b.status === "confirmed")));
  const next = upcoming[0];
  const nextWhen = next ? `${formatDate(next.date, locale, { weekday: "short", day: "numeric", month: "short" })}, ${next.time} · ${names.master(next.masterId)}` : t(ui.digest.none);
  const recent = [...bookings].sort((a, b) => b.at.localeCompare(a.at)).slice(0, 3);

  return (
    <section aria-label={t(ui.tabs.overview)}>
      <p className="adm-period">{t(ui.period)}</p>
      <div className="adm-stats">
        {stats.map((s) => (
          <div key={s.k} className="adm-stat">
            <b>{s.text}</b>
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
      <BookingList items={recent} locale={locale} names={names} compact />
      <div className="adm-digest">
        <div className="adm-digest-head">
          <h2 className="adm-h2">{t(ui.digest.title)}</h2>
          <span className="adm-sample">{t(ui.digest.sample)}</span>
        </div>
        <p>{digestBot ? t(digestCopy.caption) : t(ui.digest.text)}</p>
        <pre>{`${data.name} · ${t(ui.digest.head)}\n${fill(t(ui.digest.line1), { n: curBookings.length })}\n${fill(t(ui.digest.line2), { service: topSvc ? names.svc(topSvc[0]) : t(ui.digest.noService) })}\n${fill(t(ui.digest.line3), { when: nextWhen })}`}</pre>
        {digestBot && (
          <DigestTelegramButton
            bot={digestBot}
            locale={locale}
            payload={{
              tpl: "salon",
              locale,
              style,
              period: "week",
              values: {
                bookings: curBookings.length,
                revenue: sum(curBookings),
                quizzes,
                calls,
                telegram: telegram.cur,
                views: views.cur,
                svc: tip && topSvc ? itemCode(data.services.findIndex((s) => s.id === topSvc[0])) : 0,
                master: tip && topMaster ? itemCode(data.masters.findIndex((m) => m.id === topMaster[0])) : 0,
                masterN: tip && topMaster ? topMaster[1] : 0,
              },
            }}
          />
        )}
      </div>
    </section>
  );
}

/* ——— Записи ——— */

const sortBookings = (list: Booking[]) => [...list].sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`));

function Bookings({ locale, now, bookings, names }: { locale: Locale; now: number; bookings: Booking[]; names: Names }) {
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
          <BookingList items={g.items} locale={locale} names={names} />
        </div>
      ))}
      {past.length > 0 && (
        <>
          <h2 className="adm-h2">{t(ui.booking.past)}</h2>
          <BookingList items={past} locale={locale} names={names} showDate />
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

function BookingList({ items, locale, names, compact, showDate }: { items: Booking[]; locale: Locale; names: Names; compact?: boolean; showDate?: boolean }) {
  const t = (l: L) => pick(l, locale);
  const { demo } = useAdminStore();
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
              {b.serviceIds.map(names.svc).join(" + ")} · {names.master(b.masterId)}
              {b.anyMaster && <i> ({t(ui.booking.anyMaster)})</i>}
            </span>
            <span className="adm-plan">
              {formatMinutes(b.minutes, locale)} · {formatSum(b.total, locale)}
            </span>
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

function ServicesTab({ data, locale }: { data: SalonData; locale: Locale }) {
  const t = (l: L) => pick(l, locale);
  const { state, demo } = useAdminStore();
  const ov = { services: state.services, schedule: state.schedule, packages: state.packages };
  const sched = useMemo(() => toScheduleData(data), [data]);
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
                  {t(data.groups.find((g) => g.id === s.group)?.name ?? s.name)}
                  {e.hidden && ` · ${t(ui.services.hidden)}`}
                </small>
              </span>
              <div className="adm-range">
                <NumberEdit value={e.price} format={(n) => (n === 0 ? t(ui.services.free) : formatSum(n, locale))} label={`${t(s.name)}: ${t(ui.services.price)}`} saved={t(ui.services.saved)} onCommit={(n) => demo.setService(s.id, { price: n })} />
                <NumberEdit value={e.minutes} format={(n) => `${n} ${t(ui.services.min)}`} label={`${t(s.name)}: ${t(ui.services.minutes)}`} saved={t(ui.services.saved)} onCommit={(n) => demo.setService(s.id, { minutes: n })} />
              </div>
              <button type="button" className="adm-link" onClick={() => demo.setService(s.id, { hidden: !e.hidden })}>
                {e.hidden ? t(ui.services.show) : t(ui.services.hide)}
              </button>
            </li>
          );
        })}
      </ul>
        <h2 className="adm-h2 adm-h2-sub">{t(ui.services.packages)}</h2>
        <p className="adm-hint">{t(ui.services.packagesHint)}</p>
        <ul className="adm-items" data-kind="packages">
          {data.packages.map((p) => {
            const o = state.packages[p.id];
            const hidden = o?.hidden === true;
            const pct = packagePct(p, ov);
            const b = basketOf(sched, ov, p.serviceIds);
            return (
              <li key={p.id} className="adm-item" data-hidden={hidden || undefined}>
                <span className="adm-item-name">
                  {t(p.name)}
                  <small>
                    {p.serviceIds.map((id) => t(data.services.find((x) => x.id === id)?.name ?? { ru: id, en: id, uz: id })).join(" + ")} · {formatSum(b.price, locale)}
                    {hidden && ` · ${t(ui.services.hidden)}`}
                  </small>
                </span>
                <div className="adm-range">
                  <NumberEdit value={o?.pct ?? p.pct} format={(n) => `${t(ui.services.discount)} ${n}${t(ui.services.pct)}`} label={`${t(p.name)}: ${t(ui.services.discount)}`} saved={t(ui.services.saved)} onCommit={(n) => demo.setPackage(p.id, { pct: n })} />
                </div>
                <button type="button" className="adm-link" data-pct={pct} onClick={() => demo.setPackage(p.id, { hidden: !hidden })}>
                  {hidden ? t(ui.services.show) : t(ui.services.hide)}
                </button>
              </li>
            );
          })}
        </ul>
    </section>
  );
}

/** Число: клик по значению — поле ввода; Enter или потеря фокуса сохраняет, Esc отменяет. */
function NumberEdit({ value, format, label, saved, onCommit }: { value: number; format: (n: number) => string; label: string; saved: string; onCommit: (n: number) => void }) {
  const [editing, setEditing] = useState(false);
  const [flash, setFlash] = useState(false);
  const commit = (raw: string) => {
    const n = Number(raw.replace(/\D/g, ""));
    if (raw.trim() !== "" && n !== value) {
      onCommit(n);
      setFlash(true);
      window.setTimeout(() => setFlash(false), 1200);
    }
    setEditing(false);
  };
  if (!editing) {
    return (
      <button type="button" className="adm-price" onClick={() => setEditing(true)} aria-label={`${label}: ${format(value)}`}>
        {format(value)}
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

/* ——— Мастера и график ——— */

function MastersTab({ data, locale }: { data: SalonData; locale: Locale }) {
  const t = (l: L) => pick(l, locale);
  const { state, demo } = useAdminStore();
  const ov = { services: state.services, schedule: state.schedule, packages: state.packages };
  return (
    <section aria-label={t(ui.tabs.masters)}>
      <p className="adm-hint">{t(ui.masters.hint)}</p>
      <ul className="adm-docs">
        {data.masters.map((m) => {
          const days = masterDays(m, ov);
          const toggle = (day: number) => demo.setMasterDays(m.id, days.includes(day) ? days.filter((x) => x !== day) : [...days, day]);
          return (
            <li key={m.id} className="adm-doc">
              {/* eslint-disable-next-line @next/next/no-img-element -- переносимый шаблон: без next/image */}
              <img src={`/templates/salon/img/${m.photo}-480.webp`} width={96} height={120} alt="" loading="lazy" decoding="async" />
              <div className="adm-doc-main">
                <b>{t(m.name)}</b>
                <span>{t(m.role)}</span>
                <p className="adm-days-label" id={`days-${m.id}`}>
                  {t(ui.masters.daysLabel)}
                </p>
                <div className="adm-days" role="group" aria-labelledby={`days-${m.id}`}>
                  {ui.days[locale].map((label, day) => (
                    <button key={day} type="button" aria-pressed={days.includes(day)} onClick={() => toggle(day)}>
                      {label}
                    </button>
                  ))}
                </div>
                {days.length === 0 && <p className="adm-warn">{t(ui.masters.noDays)}</p>}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/* ——— Акция ——— */

function PromoTab({ data, locale }: { data: SalonData; locale: Locale }) {
  const t = (l: L) => pick(l, locale);
  const { state, demo } = useAdminStore();
  return (
    <section aria-label={t(ui.tabs.promo)}>
      <h2 className="adm-h2">{t(ui.promo.title)}</h2>
      <label className="adm-check">
        <input type="checkbox" checked={state.promo?.on ?? true} onChange={(e) => demo.setPromo({ on: e.target.checked })} />
        {t(ui.promo.on)}
      </label>
      <label className="adm-field">
        {t(ui.promo.text)}
        <input type="text" value={state.promo?.text?.[locale] ?? t(data.promo)} onChange={(e) => demo.setPromo({ on: state.promo?.on ?? true, text: { ...state.promo?.text, [locale]: e.target.value } })} />
      </label>
      <p className="adm-hint">{t(ui.promo.hint)}</p>
    </section>
  );
}
