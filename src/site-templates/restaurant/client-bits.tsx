"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useMinuteClock } from "../kit/hooks";
import { tashkentNow, toMinutes } from "../kit/tashkent";
import { pick, type L, type Locale } from "../types";
import { bookStore, useBook, type BookSeed } from "./book-store";
import { fill } from "./format";
import { demo, useDemoState, type EventType } from "./store";
import { restaurantUi as ui } from "./ui";

/** Считает просмотр один раз на загрузку страницы (в кабинете это «визиты на сайт»). */
export function PageView() {
  useEffect(() => {
    demo.track("view");
  }, []);
  return null;
}

/** Ссылка, которая считает клик (звонок, Telegram, маршрут) и дальше ведёт себя как обычная. */
export function TrackedLink({
  type,
  href,
  external,
  className,
  children,
  "aria-label": ariaLabel,
}: {
  type: EventType;
  href: string;
  external?: boolean;
  className?: string;
  children: ReactNode;
  "aria-label"?: string;
}) {
  return (
    <a className={className} href={href} aria-label={ariaLabel} onClick={() => demo.track(type)} {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
      {children}
    </a>
  );
}

/** Кнопка, открывающая окно брони (с готовым выбором или без). */
export function BookButton({ className, seed, children, "aria-label": ariaLabel }: { className?: string; seed?: BookSeed; children: ReactNode; "aria-label"?: string }) {
  return (
    <button type="button" className={className} aria-label={ariaLabel} title={ariaLabel} onClick={() => bookStore.open(seed)}>
      {children}
    </button>
  );
}

/** Часы с учётом правок владельца; до гидрации — из данных (разметка совпадает с серверной). */
export function useHours(open: string, close: string): { open: string; close: string } {
  const edited = useDemoState().hours;
  return { open: edited?.open ?? open, close: edited?.close ?? close };
}

/** «Открыто до 23:00» / «Откроемся в 10:00» по времени Ташкента; до гидрации — нейтральные часы. */
export function OpenStatus({ open: o, close: c, locale, className = "rs-status" }: { open: string; close: string; locale: Locale; className?: string }) {
  const { open, close } = useHours(o, c);
  const clock = useMinuteClock();
  if (clock === 0) {
    return (
      <span className={className} data-state="idle">
        {fill(pick(ui.contacts.hoursStatic, locale), { a: open, b: close })}
      </span>
    );
  }
  const now = tashkentNow(clock).minutes;
  const isOpen = now >= toMinutes(open) && now < toMinutes(close);
  return (
    <span className={className} data-state={isOpen ? "open" : "closed"}>
      <i aria-hidden="true" />
      {fill(pick(isOpen ? ui.openNow : ui.closedNow, locale), { t: isOpen ? close : open })}
    </span>
  );
}

/** Часы работы текстом, с правками из кабинета. */
export function HoursText({ open, close, locale }: { open: string; close: string; locale: Locale }) {
  const h = useHours(open, close);
  return <>{fill(pick(ui.contacts.hoursStatic, locale), { a: h.open, b: h.close })}</>;
}

/** Плашка акции: по умолчанию текст из данных, кабинет может выключить или переписать. */
export function PromoBar({ fallback, locale }: { fallback?: L; locale: Locale }) {
  const { promo } = useDemoState();
  if (promo && !promo.on) return null;
  const text = promo?.text?.[locale] ?? (fallback ? pick(fallback, locale) : "");
  if (!text) return null;
  return (
    <p className="rs-promo" role="note">
      <span>{text}</span>
    </p>
  );
}

/**
 * Липкая панель в зоне большого пальца: «Позвонить / Telegram / Забронировать».
 * Пока на виду первый экран (у него свой призыв) и пока открыто окно брони — спрятана.
 */
export function StickyBar({ phone, telegram, locale }: { phone: string; telegram: string; locale: Locale }) {
  const book = useBook();
  const [heroVisible, setHeroVisible] = useState(true);
  useEffect(() => {
    const hero = document.querySelector(".rs-hero");
    if (!hero) return;
    const io = new IntersectionObserver(([e]) => setHeroVisible(e.isIntersecting), { threshold: 0.45 });
    io.observe(hero);
    return () => io.disconnect();
  }, []);
  const hidden = book.open || heroVisible;
  return (
    <nav className="rs-sticky" data-hidden={hidden || undefined} inert={hidden} aria-label={pick(ui.quickLabel, locale)}>
      <a href={`tel:${phone}`} onClick={() => demo.track("call")}>
        {pick(ui.call, locale)}
      </a>
      <a href={`https://t.me/${telegram}`} target="_blank" rel="noopener noreferrer" onClick={() => demo.track("telegram")}>
        {pick(ui.telegram, locale)}
      </a>
      <BookButton className="primary">{pick(ui.bookShort, locale)}</BookButton>
    </nav>
  );
}
