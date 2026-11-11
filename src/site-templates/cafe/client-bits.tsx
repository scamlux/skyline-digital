"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useMinuteClock } from "../kit/hooks";
import { tashkentNow, toMinutes } from "../kit/tashkent";
import { formatSum, pick, type L, type Locale } from "../types";
import { cartCount, cartSubtotal } from "./pricing";
import { useCart, cartStore } from "./cart-store";
import { IconBag } from "./icons";
import { pricingFor } from "./shop";
import { demo, useCafeState, type EventType } from "./store";
import { cafeUi as ui } from "./ui";

/** Считает просмотр один раз на загрузку страницы (в кабинете это «визиты на сайт»). */
export function PageView() {
  useEffect(() => {
    demo.track("view");
  }, []);
  return null;
}

/** Ссылка, которая считает клик (звонок, Telegram, маршрут) и дальше ведёт себя как обычная. */
export function TrackedLink({ type, href, external, className, children, "aria-label": ariaLabel }: { type: EventType; href: string; external?: boolean; className?: string; children: ReactNode; "aria-label"?: string }) {
  return (
    <a className={className} href={href} aria-label={ariaLabel} onClick={() => demo.track(type)} {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
      {children}
    </a>
  );
}

/** Состояние «открыто сейчас» по времени Ташкента; до гидрации — нейтральные часы (разметка совпадает с серверной). */
export function useOpenState(open: string, close: string): "idle" | "open" | "closed" {
  const clock = useMinuteClock();
  if (clock === 0) return "idle";
  const now = tashkentNow(clock).minutes;
  return now >= toMinutes(open) && now < toMinutes(close) ? "open" : "closed";
}

/** «Открыто до 22:00» / «Закрыто · откроемся в 08:00». */
export function OpenStatus({ open, close, locale, className = "cf-status" }: { open: string; close: string; locale: Locale; className?: string }) {
  const state = useOpenState(open, close);
  const text = state === "idle" ? pick(ui.hoursStatic, locale).replace("{a}", open).replace("{b}", close) : pick(state === "open" ? ui.openUntil : ui.closedUntil, locale).replace("{t}", state === "open" ? close : open);
  return (
    <span className={className} data-state={state}>
      <i aria-hidden="true" />
      {text}
    </span>
  );
}

/** Плашка акции над меню: по умолчанию текст из данных, кабинет может выключить или переписать. */
export function PromoBar({ fallback, locale }: { fallback: L; locale: Locale }) {
  const { promo } = useCafeState();
  if (promo && !promo.on) return null;
  const text = promo?.text?.[locale] ?? pick(fallback, locale);
  if (!text) return null;
  return (
    <p className="cf-promo" role="status">
      <span>{text}</span>
    </p>
  );
}

/** Кнопка корзины в шапке: число позиций, открывает шторку. */
export function HeaderCart({ locale }: { locale: Locale }) {
  const cart = useCart();
  const n = cartCount(cart.lines);
  return (
    <button type="button" className="cf-cartbtn" onClick={() => cartStore.openCart()} aria-label={`${pick(ui.cart.open, locale)}${n ? `: ${n}` : ""}`}>
      <IconBag />
      {n > 0 && <b>{n}</b>}
    </button>
  );
}

/**
 * Липкая панель в зоне большого пальца. Корзина пуста — «Заказать навынос» ведёт к меню;
 * в корзине что-то есть — вместо неё «пилюля» с числом позиций и суммой, открывает шторку.
 */
export function StickyBar({ locale }: { locale: Locale }) {
  const cart = useCart();
  const state = useCafeState();
  const pricing = useMemo(() => pricingFor(state), [state]);
  const n = cartCount(cart.lines);
  // Пока первый экран на виду, у него своя кнопка «Заказать навынос» — панель не дублирует её.
  const [heroVisible, setHeroVisible] = useState(true);
  useEffect(() => {
    const hero = document.querySelector(".cf-hero");
    if (!hero) return;
    const io = new IntersectionObserver(([e]) => setHeroVisible(e.isIntersecting), { threshold: 0.35 });
    io.observe(hero);
    return () => io.disconnect();
  }, []);
  const hidden = cart.open || cart.optionsFor !== null || (n === 0 && heroVisible);
  return (
    <div className="cf-sticky" data-hidden={hidden || undefined} data-empty={n === 0 || undefined} inert={hidden}>
      {n > 0 ? (
        <button type="button" className="cf-pill" onClick={() => cartStore.openCart()}>
          <span className="cf-pill-n">
            <IconBag />
            <b>{n}</b>
          </span>
          <span className="cf-pill-t">{pick(ui.cart.open, locale)}</span>
          <span className="cf-pill-s">{formatSum(cartSubtotal(cart.lines, pricing), locale)}</span>
        </button>
      ) : (
        <a className="cf-pill" href="#menu">
          <span className="cf-pill-t grow">{pick(ui.order, locale)}</span>
        </a>
      )}
    </div>
  );
}
