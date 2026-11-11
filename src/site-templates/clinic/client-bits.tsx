"use client";

import { useEffect, useState } from "react";
import { tashkentNow } from "../kit/tashkent";
import { useMinuteClock } from "../kit/hooks";
import { pick, type Locale } from "../types";
import { planDraft } from "./plan-store";
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
  const shown = promo?.text?.[locale] ?? text;
  if (!shown) return null;
  return (
    <p className="cl-promo" role="note">
      {shown}
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

/** Кнопка «Записаться»: открывает окно записи с тем, что уже выбрано на странице. */
export function BookButton({ locale, className }: { locale: Locale; className?: string }) {
  return (
    <button type="button" className={className} onClick={() => planDraft.open()}>
      {pick(ui.book, locale)}
    </button>
  );
}

/**
 * Липкая панель на телефоне (зона большого пальца): «Позвонить / Telegram / Записаться».
 * Прячется, пока на экране карта зубов — у неё своя кнопка, и пока открыта панель решения
 * (это делает CSS через :has). В окне записи панель закрыта самим окном.
 */
export function StickyBar({ phone, telegram, locale }: { phone: string; telegram: string; locale: Locale }) {
  const [hidden, setHidden] = useState(false);
  useEffect(() => {
    const target = document.getElementById("jaw");
    if (!target) return;
    const io = new IntersectionObserver(([e]) => setHidden(e.isIntersecting), { threshold: 0.25 });
    io.observe(target);
    return () => io.disconnect();
  }, []);
  return (
    <nav className="cl-sticky" data-hidden={hidden || undefined} inert={hidden} aria-label={pick(ui.quickLabel, locale)}>
      <a href={`tel:${phone}`} onClick={() => demo.track("call")}>
        {pick(ui.call, locale)}
      </a>
      <a href={`https://t.me/${telegram}`} target="_blank" rel="noopener noreferrer" onClick={() => demo.track("telegram")}>
        {pick(ui.telegram, locale)}
      </a>
      <BookButton locale={locale} className="primary" />
    </nav>
  );
}
