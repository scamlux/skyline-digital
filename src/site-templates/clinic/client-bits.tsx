"use client";

import { useEffect, useState } from "react";
import { addDays, formatDate, tashkentNow } from "../kit/tashkent";
import { useMinuteClock } from "../kit/hooks";
import { pick, type Locale } from "../types";
import { planDraft } from "./plan-store";
import { formatRange } from "./format";
import { nextFreeSlot, type ScheduleData } from "./schedule";
import { demo, useClinicState, type EventType } from "./store";
import { clinicUi as ui } from "./ui";

const toMinutes = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};

/**
 * «Открыто до 19:00» / «Откроемся в 09:00». Считается в браузере по времени Ташкента;
 * до гидрации показываем нейтральные часы, чтобы разметка совпала с серверной.
 */
export function OpenStatus({ open, close, closedDays, locale }: { open: string; close: string; closedDays: number[]; locale: Locale }) {
  const clock = useMinuteClock();
  if (clock === 0) {
    return (
      <span className="tpl-status" data-state="idle">
        {pick(ui.hoursLabel, locale)} · {open}–{close}
      </span>
    );
  }
  const now = tashkentNow(clock);
  const todayOff = closedDays.includes(now.weekday);
  const isOpen = !todayOff && now.minutes >= toMinutes(open) && now.minutes < toMinutes(close);
  // Завтра выходной (суббота вечером) или сегодня выходной — следующее открытие в понедельник.
  const nextIsMonday = todayOff || (now.minutes >= toMinutes(close) && closedDays.includes((now.weekday + 1) % 7));
  const text = isOpen
    ? pick(ui.openNow, locale).replace("{t}", close)
    : pick(nextIsMonday ? ui.closedMonday : ui.closedNow, locale).replace("{t}", open);
  return (
    <span className="tpl-status" data-state={isOpen ? "open" : "closed"}>
      <i aria-hidden="true" />
      {text}
    </span>
  );
}

/** Баннер-акция: текст и включение — из кабинета; по умолчанию показан текст из данных. */
export function PromoBar({ text, locale }: { text: string; locale: Locale }) {
  const promo = useClinicState().promo;
  if (promo && !promo.on) return null;
  return (
    <p className="tpl-promo" role="note">
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
export function TrackedLink({
  type,
  className,
  href,
  children,
  external,
}: {
  type: EventType;
  className?: string;
  href: string;
  children: React.ReactNode;
  external?: boolean;
}) {
  return (
    <a className={className} href={href} onClick={() => demo.track(type)} {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
      {children}
    </a>
  );
}

/**
 * Липкая панель на телефоне: «Позвонить / Telegram / Записаться».
 * Пока на экране блок записи — прячется: у формы своя кнопка, а панель закрывала бы её.
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
    <nav className="tpl-sticky" data-hidden={hidden || undefined} inert={hidden} aria-label={pick(ui.quickLabel, locale)}>
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

/**
 * Карточка услуги: серверная разметка (иконка, название, описание) приходит children,
 * цена и скрытие — из кабинета владельца. Клик по «Записаться» предвыбирает услугу в форме.
 */
export function ServiceCard({
  id,
  base,
  locale,
  index,
  children,
}: {
  id: string;
  base: { min: number; max: number };
  locale: Locale;
  index: number;
  children: React.ReactNode;
}) {
  const state = useClinicState();
  const o = state.services[id];
  if (o?.hidden) return null;
  const min = Math.max(0, o?.min ?? base.min);
  const max = Math.max(min, o?.max ?? base.max);
  return (
    <li data-reveal style={{ "--d": index } as React.CSSProperties}>
      <div className="tpl-svc" data-tilt>
        {children}
        <p className="tpl-svc-price">{max === 0 ? pick(ui.services.free, locale) : formatRange(min, max, locale)}</p>
        <a className="tpl-svc-book" href="#book" onClick={() => planDraft.send({ serviceId: id })}>
          {pick(ui.services.book, locale)} <span aria-hidden="true">→</span>
        </a>
      </div>
    </li>
  );
}

/** Кнопка «записаться к врачу»: предвыбирает врача в форме. */
export function DoctorBook({ doctorId, locale }: { doctorId: string; locale: Locale }) {
  return (
    <a className="tpl-link" href="#book" onClick={() => planDraft.send({ doctorId })}>
      {pick(ui.doctors.book, locale)} →
    </a>
  );
}

/**
 * Карточка «Ближайшее окно» в hero. Окно считается той же функцией, что и сетка записи
 * (график врачей, занятые слоты, правки кабинета), поэтому время на карточке всегда
 * совпадает со свободным слотом в форме.
 */
export function NextFreeCard({ sched, doctorNames, locale }: { sched: ScheduleData; doctorNames: Record<string, string>; locale: Locale }) {
  const clock = useMinuteClock();
  const state = useClinicState();
  let value = "—";
  let sub = "";
  if (clock > 0) {
    const now = tashkentNow(clock);
    const slot = nextFreeSlot(sched, { services: state.services, schedule: state.schedule }, state.bookings, now);
    if (!slot) value = pick(ui.float.noSlot, locale);
    else {
      const when =
        slot.date === now.iso
          ? pick(ui.float.today, locale)
          : slot.date === addDays(now.iso, 1)
            ? pick(ui.float.tomorrow, locale)
            : formatDate(slot.date, locale, { weekday: "short", day: "numeric", month: "short" });
      value = `${when}, ${slot.time}`;
      sub = doctorNames[slot.doctorId] ?? "";
    }
  }
  return (
    <a className="tpl-glass tpl-glass-slot" href="#book" data-depth="1.1">
      <small>{pick(ui.float.nextTitle, locale)}</small>
      <b aria-live="polite">{value}</b>
      <span>{sub}</span>
    </a>
  );
}
