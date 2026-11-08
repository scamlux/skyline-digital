"use client";

import { useEffect, useMemo } from "react";
import { useMinuteClock } from "../kit/hooks";
import { plural } from "../kit/plural";
import { tashkentNow, toMinutes } from "../kit/tashkent";
import { pick, type Locale } from "../types";
import { useSalon, useSalonStore } from "./context";
import { bookingDraft } from "./draft-store";
import { fill, whenLabel } from "./format";
import { Icon } from "./icons";
import { nextFreeSlot, type SalonOverrides } from "./schedule";
import { rememberStyle, type EventType } from "./store";
import { salonUi as ui } from "./ui";

const IMG = "/templates/salon/img";

/** Правки владельца из хранилища одним стабильным объектом. */
export function useOverrides(): SalonOverrides {
  const { state } = useSalonStore();
  return useMemo(() => ({ services: state.services, schedule: state.schedule, packages: state.packages }), [state.services, state.schedule, state.packages]);
}

/**
 * «Открыто до 21:00» / «Откроемся в 10:00». Считается в браузере по времени Ташкента;
 * до гидрации показываем нейтральные часы, чтобы разметка совпала с серверной.
 */
export function OpenStatus({ open, close, locale }: { open: string; close: string; locale: Locale }) {
  const clock = useMinuteClock();
  if (clock === 0) {
    return (
      <span className="sl-status" data-state="idle">
        {pick(ui.hoursLabel, locale)} · {open}–{close}
      </span>
    );
  }
  const now = tashkentNow(clock);
  const isOpen = now.minutes >= toMinutes(open) && now.minutes < toMinutes(close);
  const text = pick(isOpen ? ui.openNow : ui.closedNow, locale).replace("{t}", isOpen ? close : open);
  return (
    <span className="sl-status" data-state={isOpen ? "open" : "closed"}>
      <i aria-hidden="true" />
      {text}
    </span>
  );
}

/** Строка-акция под первым экраном: текст и включение — из кабинета; по умолчанию текст из данных. */
export function PromoStrip({ text, locale }: { text: string; locale: Locale }) {
  const { state } = useSalonStore();
  const promo = state.promo;
  if (promo && !promo.on) return null;
  return (
    <p className="sl-promo" role="note">
      {promo?.text?.[locale] ?? text}
    </p>
  );
}

/** Один просмотр страницы = одно событие «view»; запоминает бизнес, чтобы кабинет открылся на нём. */
export function PageView() {
  const { style } = useSalon();
  const { demo } = useSalonStore();
  useEffect(() => {
    rememberStyle(style);
    demo.track("view");
  }, [style, demo]);
  return null;
}

/** Ссылка-действие (позвонить, Telegram, маршрут): клик фиксируется в демо-кабинете. */
export function TrackedLink({ type, className, href, children, external }: { type: EventType; className?: string; href: string; children: React.ReactNode; external?: boolean }) {
  const { demo } = useSalonStore();
  return (
    <a className={className} href={href} onClick={() => demo.track(type)} {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
      {children}
    </a>
  );
}

/** Кнопка «Записаться»: открывает шторку записи. Единственное главное действие сайта. */
export function BookButton({ className, id, label, preset }: { className?: string; id?: string; label?: string; preset?: Parameters<typeof bookingDraft.open>[0] }) {
  const { locale } = useSalon();
  return (
    <button type="button" id={id} className={className ?? "sl-btn"} onClick={() => bookingDraft.open(preset)}>
      {label ?? pick(ui.book, locale)}
    </button>
  );
}

/**
 * Следит за главной кнопкой hero и финальной кнопкой и ставит на корень data-hero-cta, пока любая из них на экране.
 * Пока атрибут есть, кнопка в шапке и нижняя панель скрыты: в одном экране одна «Записаться».
 */
export function CtaWatcher() {
  useEffect(() => {
    const targets = Array.from(document.querySelectorAll<HTMLElement>("#hero-cta, .sl-final .sl-btn"));
    const root = targets[0]?.closest<HTMLElement>("[data-tpl]");
    if (!root) return;
    const visible = new Set<Element>();
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.isIntersecting) visible.add(e.target);
        else visible.delete(e.target);
      }
      if (visible.size > 0) root.dataset.heroCta = "1";
      else delete root.dataset.heroCta;
    });
    targets.forEach((t) => io.observe(t));
    return () => {
      io.disconnect();
      delete root.dataset.heroCta;
    };
  }, []);
  return null;
}

/**
 * Нижняя панель большого пальца на телефоне: «Позвонить / Telegram / Записаться». Прячется,
 * пока на экране кнопка hero (одна «Записаться» на экран), и когда открыта шторка записи.
 */
export function ActionBar({ phone, telegram, locale }: { phone: string; telegram: string; locale: Locale }) {
  const { demo } = useSalonStore();
  return (
    <nav className="sl-bar" aria-label={pick(ui.quickLabel, locale)}>
      <a className="sl-bar-ic" href={`tel:${phone}`} onClick={() => demo.track("call")} aria-label={pick(ui.call, locale)}>
        <Icon id="phone" size={22} />
      </a>
      <a className="sl-bar-ic" href={`https://t.me/${telegram}`} target="_blank" rel="noopener noreferrer" onClick={() => demo.track("telegram")} aria-label={pick(ui.telegram, locale)}>
        <Icon id="telegram" size={22} />
      </a>
      <button type="button" className="sl-btn sl-bar-book" onClick={() => bookingDraft.open()}>
        {pick(ui.book, locale)}
      </button>
    </nav>
  );
}

/** Окно мастера (или любого мастера) строкой «Сегодня, 14:30»; undefined до гидрации, null — окон нет. */
export function useNextWindowFor(masterId?: string, serviceIds?: string[]): { label: string; masterId: string | null } | null | undefined {
  const clock = useMinuteClock();
  const { state } = useSalonStore();
  const { sched, locale } = useSalon();
  const ov = useOverrides();
  const key = serviceIds?.join(",");
  return useMemo(() => {
    if (clock === 0) return undefined;
    const now = tashkentNow(clock);
    const slot = nextFreeSlot(sched, ov, state.bookings, now, { masterId, serviceIds: key ? key.split(",") : [] });
    return slot ? { label: whenLabel(slot.date, slot.time, now.iso, locale), masterId: slot.masterId } : null;
  }, [clock, sched, ov, state.bookings, masterId, key, locale]);
}

/** Чип в hero: ближайшее окно любого мастера; нажатие открывает запись. */
export function NextWindowChip() {
  const { locale } = useSalon();
  const win = useNextWindowFor();
  const value = win === undefined ? "—" : win ? win.label : pick(ui.next.none, locale);
  return (
    <button type="button" className="sl-chip-slot" onClick={() => bookingDraft.open()}>
      <Icon id="clock" size={18} />
      <span>
        <small>{pick(ui.next.title, locale)}</small>
        <b aria-live="polite">{value}</b>
      </span>
    </button>
  );
}

/** Секция «Мастера»: горизонтальная лента с аватарами, опытом и «ближайшим окном» по расписанию. */
export function MasterCards() {
  const { masters, locale } = useSalon();
  return (
    <ul className="sl-masters sl-snap" aria-label={pick(ui.masters.label, locale)}>
      {masters.map((m) => (
        <MasterCard key={m.id} master={m} locale={locale} />
      ))}
    </ul>
  );
}

function MasterCard({ master, locale }: { master: ReturnType<typeof useSalon>["masters"][number]; locale: Locale }) {
  const ov = useOverrides();
  const off = (ov.schedule[master.id] ?? [1]).length === 0;
  const win = useNextWindowFor(master.id);
  const value = off ? pick(ui.masters.dayOff, locale) : win === undefined ? "—" : win ? win.label : pick(ui.masters.noSlot, locale);
  return (
    <li className="sl-master" data-off={off || undefined}>
      {/* eslint-disable-next-line @next/next/no-img-element -- шаблон переносимый: без next/image */}
      <img src={`${IMG}/${master.photo}-480.webp`} srcSet={`${IMG}/${master.photo}-480.webp 480w, ${IMG}/${master.photo}-960.webp 960w`} sizes="(max-width: 860px) 62vw, 300px" width={960} height={1200} alt={master.name} loading="lazy" decoding="async" />
      <div className="sl-master-body">
        <h3>{master.name}</h3>
        <p className="sl-master-role">{master.role}</p>
        <p className="sl-master-years">{fill("{n} {w}", { n: master.years, w: plural(locale, master.years, ui.years[locale]) })}</p>
        <p className="sl-master-next">
          <Icon id="clock" size={16} />
          <b aria-live="polite">{value}</b>
        </p>
        <button type="button" className="sl-btn sl-btn-line" disabled={off} onClick={() => bookingDraft.open({ masterId: master.id, serviceIds: [], step: 1 })}>
          {pick(ui.book, locale)}
          <span className="sr-only"> — {master.name}</span>
        </button>
      </div>
    </li>
  );
}
