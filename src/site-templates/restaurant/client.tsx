"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { formatSum, pick, type Locale } from "../types";
import { restaurantUi as ui } from "./ui";
import { demo, useDemoState, type EventType } from "./store";

const minutes = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};

/** Минуты с начала суток в Ташкенте (UTC+5, без перехода на летнее время). */
function tashkentMinutes(): number {
  const now = new Date();
  return (now.getUTCHours() * 60 + now.getUTCMinutes() + 5 * 60) % 1440;
}

const subscribe = (cb: () => void) => {
  const id = window.setInterval(cb, 30_000);
  return () => window.clearInterval(id);
};

/**
 * «Открыто до 23:00» / «Откроемся в 10:00». Считается в браузере по времени Ташкента;
 * до гидрации показываем нейтральные часы работы, чтобы разметка совпала с серверной.
 */
export function OpenStatus({ open: o, close: c, locale }: { open: string; close: string; locale: Locale }) {
  const now = useSyncExternalStore(subscribe, tashkentMinutes, () => -1);
  const edited = useDemoState().hours;
  const open = edited?.open ?? o;
  const close = edited?.close ?? c;
  if (now < 0) {
    return (
      <span className="tpl-status" data-state="idle">
        {pick(ui.hoursLabel, locale)} · {open}–{close}
      </span>
    );
  }
  const isOpen = now >= minutes(open) && now < minutes(close);
  return (
    <span className="tpl-status" data-state={isOpen ? "open" : "closed"}>
      <i aria-hidden="true" />
      {pick(isOpen ? ui.openNow : ui.closedNow, locale).replace("{t}", isOpen ? close : open)}
    </span>
  );
}

type Errors = Partial<Record<"name" | "phone" | "when", string>>;

/**
 * Форма брони: имя, телефон, дата/время, число гостей. Без аккаунтов и капч.
 * mode "telegram" — открывает чат владельца с готовым текстом (работает без сервера,
 * в том числе на бесплатном хостинге); mode "demo" — показывает подтверждение.
 */
export function BookingForm({
  mode,
  telegram,
  restaurant,
  locale,
}: {
  mode: "demo" | "telegram";
  telegram: string;
  restaurant: string;
  locale: Locale;
}) {
  const f = ui.form;
  const [errors, setErrors] = useState<Errors>({});
  const [sent, setSent] = useState(false);
  const [tgUrl, setTgUrl] = useState<string | null>(null);
  const successRef = useRef<HTMLHeadingElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const wasSent = useRef(false);

  // Кнопка, на которой стоял фокус, исчезает при смене состояния — переносим фокус сами:
  // на заголовок подтверждения (его же прочитает скринридер), а при «Отправить ещё» — на первое поле.
  useEffect(() => {
    if (sent) successRef.current?.focus();
    else if (wasSent.current) formRef.current?.querySelector<HTMLElement>("[name=name]")?.focus();
    wasSent.current = sent;
  }, [sent]);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const name = String(fd.get("name") ?? "").trim();
    const phone = String(fd.get("phone") ?? "").trim();
    const when = String(fd.get("when") ?? "").trim();
    const guests = String(fd.get("guests") ?? "2");
    const next: Errors = {};
    if (name.length < 2) next.name = pick(f.errName, locale);
    if (phone.replace(/\D/g, "").length < 9) next.phone = pick(f.errPhone, locale);
    if (!when) next.when = pick(f.errWhen, locale);
    setErrors(next);
    if (Object.keys(next).length) {
      // Фокус на первое поле с ошибкой — удобно и для клавиатуры, и для скринридера.
      const first = (["name", "phone", "when"] as const).find((k) => next[k]);
      if (first) e.currentTarget.querySelector<HTMLElement>(`[name="${first}"]`)?.focus();
      return;
    }
    demo.addLead({ name, phone, when, guests });
    if (mode === "telegram") {
      const text = `${pick(f.messageHead, locale)} · ${restaurant}\n${name}, ${phone}\n${when}, ${pick(f.guests, locale).toLowerCase()}: ${guests}`;
      const url = `https://t.me/${telegram}?text=${encodeURIComponent(text)}`;
      // Открыть не получится, если браузер заблокировал окно или Telegram не установлен, а
      // window.open с noopener ничего об этом не сообщает — поэтому ссылка остаётся на экране.
      window.open(url, "_blank", "noopener");
      setTgUrl(url);
    }
    setSent(true);
  }

  if (sent) {
    return (
      <div className="tpl-success" role="status">
        <h3 ref={successRef} tabIndex={-1}>
          {pick(f.successTitle, locale)}
        </h3>
        <p>{pick(f.successText, locale)}</p>
        {mode === "demo" && <p className="tpl-note">{pick(f.demoNote, locale)}</p>}
        {mode === "telegram" && tgUrl && (
          <>
            <a className="tpl-btn" href={tgUrl} target="_blank" rel="noopener noreferrer">
              {pick(f.openTelegram, locale)}
            </a>
            <p className="tpl-note">{pick(f.openTelegramHint, locale)}</p>
          </>
        )}
        <button type="button" className="tpl-btn ghost" onClick={() => setSent(false)}>
          {pick(f.again, locale)}
        </button>
      </div>
    );
  }

  return (
    <form ref={formRef} className="tpl-form" onSubmit={onSubmit} noValidate>
      <div className="tpl-field">
        <label htmlFor="bk-name">{pick(f.name, locale)}</label>
        <input id="bk-name" name="name" autoComplete="given-name" aria-invalid={!!errors.name} aria-describedby={errors.name ? "bk-name-e" : undefined} />
        {errors.name && (
          <p id="bk-name-e" className="tpl-err">
            {errors.name}
          </p>
        )}
      </div>
      <div className="tpl-field">
        <label htmlFor="bk-phone">{pick(f.phone, locale)}</label>
        <input id="bk-phone" name="phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="+998 90 123 45 67" aria-invalid={!!errors.phone} aria-describedby={errors.phone ? "bk-phone-e" : undefined} />
        {errors.phone && (
          <p id="bk-phone-e" className="tpl-err">
            {errors.phone}
          </p>
        )}
      </div>
      <div className="tpl-row">
        <div className="tpl-field">
          <label htmlFor="bk-when">{pick(f.when, locale)}</label>
          <input id="bk-when" name="when" type="datetime-local" aria-invalid={!!errors.when} aria-describedby={errors.when ? "bk-when-e" : undefined} />
          {errors.when && (
            <p id="bk-when-e" className="tpl-err">
              {errors.when}
            </p>
          )}
        </div>
        <div className="tpl-field narrow">
          <label htmlFor="bk-guests">{pick(f.guests, locale)}</label>
          <select id="bk-guests" name="guests" defaultValue="2">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
            <option value="9+">9+</option>
          </select>
        </div>
      </div>
      <button type="submit" className="tpl-btn">
        {pick(f.submit, locale)}
      </button>
      <p className="tpl-note">{pick(f.consent, locale)}</p>
    </form>
  );
}

/**
 * Липкая панель на телефоне: «Позвонить / Telegram / Забронировать».
 * Пока на экране блок брони — прячется: у формы своя кнопка, а панель закрывала бы её.
 */
export function StickyBar({
  phone,
  telegram,
  locale,
}: {
  phone: string;
  telegram: string;
  locale: Locale;
}) {
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
    <a
      className={className}
      href={href}
      onClick={() => demo.track(type)}
      {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
    >
      {children}
    </a>
  );
}

/** Один просмотр страницы = одно событие «view» (для счётчика в кабинете). */
export function PageView() {
  useEffect(() => {
    demo.track("view");
  }, []);
  return null;
}

/**
 * Часы работы с учётом правок владельца. Серверная разметка — из данных; после
 * гидрации подставляются часы из кабинета.
 */
export function HoursText({ open, close }: { open: string; close: string }) {
  const edited = useDemoState().hours;
  return (
    <strong>
      {edited?.open ?? open}–{edited?.close ?? close}
    </strong>
  );
}

/** Баннер-акция: текст и включение — из кабинета; по умолчанию показан текст из данных. */
export function PromoBar({ text, locale }: { text: string; locale: Locale }) {
  const promo = useDemoState().promo;
  if (promo && !promo.on) return null;
  const t = promo?.text?.[locale] ?? text;
  return (
    <p className="tpl-promo" role="note">
      {t}
    </p>
  );
}

/**
 * Цена и наличие блюда с учётом правок владельца. Серверная разметка — из данных;
 * после гидрации подставляются значения из кабинета.
 */
export function ItemPrice({
  id,
  price,
  available,
  unavailableLabel,
  locale,
}: {
  id: string;
  price: number;
  available: boolean;
  unavailableLabel: string;
  locale: Locale;
}) {
  const o = useDemoState().items[id];
  const out = o?.available === false || (o?.available === undefined && !available);
  return <span className="tpl-item-price">{out ? unavailableLabel : formatSum(o?.price ?? price, locale)}</span>;
}

/** Обёртка позиции меню: data-out для стоп-листа, hidden — если владелец скрыл блюдо. */
export function ItemRow({ id, available, children }: { id: string; available: boolean; children: React.ReactNode }) {
  const o = useDemoState().items[id];
  const out = o?.available === false || (o?.available === undefined && !available);
  if (o?.hidden) return null;
  return (
    <li className="tpl-item" data-out={out || undefined}>
      {children}
    </li>
  );
}
