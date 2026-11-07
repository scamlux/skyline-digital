"use client";

import { useEffect, useMemo, useState } from "react";
import { useMinuteClock } from "../kit/hooks";
import { plural } from "../kit/plural";
import { tashkentNow, toMinutes } from "../kit/tashkent";
import { pick, type Locale } from "../types";
import { useSalon } from "./context";
import { bookingDraft, goToBooking } from "./draft-store";
import { whenLabel } from "./format";
import { nextFreeSlot, type SalonOverrides } from "./schedule";
import { demo, useSalonState, type EventType } from "./store";
import { salonUi as ui } from "./ui";

/** Правки владельца из хранилища одним стабильным объектом. */
export function useOverrides(): SalonOverrides {
  const state = useSalonState();
  return useMemo(() => ({ services: state.services, schedule: state.schedule }), [state.services, state.schedule]);
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

/** Баннер-акция: текст и включение — из кабинета; по умолчанию показан текст из данных. */
export function PromoBar({ text, locale }: { text: string; locale: Locale }) {
  const promo = useSalonState().promo;
  if (promo && !promo.on) return null;
  return (
    <p className="sl-promo" role="note">
      {promo?.text?.[locale] ?? text}
    </p>
  );
}

/** Один просмотр страницы = одно событие «view» (для счётчика в кабинете). */
export function PageView() {
  useEffect(() => {
    demo.track("view");
  }, []);
  return null;
}

/** Ссылка-действие (позвонить, Telegram, маршрут): клик фиксируется в демо-кабинете. */
export function TrackedLink({ type, className, href, children, external }: { type: EventType; className?: string; href: string; children: React.ReactNode; external?: boolean }) {
  return (
    <a className={className} href={href} onClick={() => demo.track(type)} {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
      {children}
    </a>
  );
}

/**
 * Липкая панель на телефоне: «Позвонить / Telegram / Записаться». Пока на экране блок записи —
 * прячется: у формы своя кнопка, а панель закрывала бы её.
 */
export function StickyBar({ phone, telegram, locale }: { phone: string; telegram: string; locale: Locale }) {
  const [hidden, setHidden] = useState(false);
  useEffect(() => {
    const target = document.getElementById("book");
    if (!target) return;
    const io = new IntersectionObserver(([e]) => setHidden(e.isIntersecting), { threshold: 0.05 });
    io.observe(target);
    return () => io.disconnect();
  }, []);
  return (
    <nav className="sl-sticky" data-hidden={hidden || undefined} inert={hidden} aria-label={pick(ui.quickLabel, locale)}>
      <a href={`tel:${phone}`} onClick={() => demo.track("call")}>
        {pick(ui.call, locale)}
      </a>
      <a href={`https://t.me/${telegram}`} target="_blank" rel="noopener noreferrer" onClick={() => demo.track("telegram")}>
        {pick(ui.telegram, locale)}
      </a>
      <a href="#book" className="primary">
        {pick(ui.bookShort, locale)}
      </a>
    </nav>
  );
}

/** Окно мастера (или любого мастера) строкой «Сегодня, 14:30»; undefined до гидрации, null — окон нет. */
export function useNextWindowFor(masterId?: string, serviceIds?: string[]): { label: string; masterId: string | null } | null | undefined {
  const clock = useMinuteClock();
  const state = useSalonState();
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

const useNextWindow = (masterId?: string) => useNextWindowFor(masterId);

/** Плавающая карточка в hero: ближайшее окно любого мастера. */
export function NextWindowCard() {
  const { locale, masters } = useSalon();
  const win = useNextWindow();
  const value = win === undefined ? "—" : win ? win.label : pick(ui.float.noSlot, locale);
  const who = win ? masters.find((m) => m.id === win.masterId)?.name : "";
  return (
    <a className="sl-chip sl-chip-slot" href="#book">
      <small>{pick(ui.float.nextTitle, locale)}</small>
      <b aria-live="polite">{value}</b>
      <span>{who}</span>
    </a>
  );
}

/** Секция «Мастера»: фото, специальность, опыт и «ближайшее окно» по расписанию. */
export function MasterCards() {
  const { masters, locale } = useSalon();
  return (
    <ul className="sl-masters">
      {masters.map((m, i) => (
        <MasterCard key={m.id} index={i} master={m} locale={locale} />
      ))}
    </ul>
  );
}

function MasterCard({ master, locale, index }: { master: ReturnType<typeof useSalon>["masters"][number]; locale: Locale; index: number }) {
  const win = useNextWindow(master.id);
  const value = win === undefined ? "—" : win ? win.label : pick(ui.masters.noSlot, locale);
  return (
    <li data-reveal style={{ "--d": index } as React.CSSProperties}>
      <div className="sl-master" data-tilt>
      {/* eslint-disable-next-line @next/next/no-img-element -- шаблон переносимый: без next/image */}
      <img src={`/templates/salon/img/${master.photo}-480.webp`} srcSet={`/templates/salon/img/${master.photo}-480.webp 480w, /templates/salon/img/${master.photo}-960.webp 960w`} sizes="(max-width: 860px) 72vw, 360px" width={960} height={1200} alt={master.name} loading="lazy" decoding="async" />
      <div className="sl-master-body">
        <h3>{master.name}</h3>
        <p className="sl-master-role">{master.role}</p>
        <p className="sl-master-years">
          <b>{master.years}</b> {plural(locale, master.years, ui.years[locale])}
        </p>
        <p className="sl-master-next">
          <small>{pick(ui.masters.nextTitle, locale)}</small>
          <b aria-live="polite">{value}</b>
        </p>
        <a
          className="sl-link"
          href="#book"
          onClick={(e) => {
            e.preventDefault();
            bookingDraft.send({ masterId: master.id, serviceIds: master.serviceIds.slice(0, 1) });
            goToBooking();
          }}
        >
          {pick(ui.masters.book, locale)} →
        </a>
      </div>
      </div>
    </li>
  );
}

