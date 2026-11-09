"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useMinuteClock } from "../kit/hooks";
import { tashkentNow } from "../kit/tashkent";
import { formatSum, pick, type Locale } from "../types";
import { buildOrderText, cartCount, cartSubtotal, freeCupDiscount, freeCupReady, isValidPickup, lineUnit, planPickup, qtyOfItem, telegramLink, type CartLine, type PickupPlan } from "./pricing";
import { cartStore, useCart } from "./cart-store";
import { itemById, photoOf } from "./data";
import { fill, optionWords, pickupLabel } from "./format";
import { IconCheck, IconClose, IconMinus, IconPlus, IconSend } from "./icons";
import { Photo, Glyph } from "./media";
import { Sheet } from "./Sheet";
import { effective, isCoffee, pricingFor } from "./shop";
import { demo, useCafeState, type Order } from "./store";
import { cafeUi as ui } from "./ui";

type Step = 0 | 1 | 2;
const STEPS = ["order", "time", "contacts"] as const;
const MIN_PHONE_DIGITS = 9;

interface Props {
  locale: Locale;
  shop: string;
  telegram: string;
  hours: { open: string; close: string };
  mode: "demo" | "telegram";
  /** false в режиме "client": карты лояльности и пометок «демо» нет. По умолчанию true (витрина студии). */
  loyalty?: boolean;
}

/** Шторка заказа «заберу сам»: три шага — заказ, время, контакты; затем подтверждение. */
export function CartSheet({ locale, shop, telegram, hours, mode, loyalty = true }: Props) {
  const cart = useCart();
  return (
    <Sheet open={cart.open} onClose={() => cartStore.closeCart()} label={pick(ui.cart.title, locale)} className="cf-cart">
      {cart.open && <CartFlow locale={locale} shop={shop} telegram={telegram} hours={hours} mode={mode} loyalty={loyalty} />}
    </Sheet>
  );
}

function CartFlow({ locale, shop, telegram, hours, mode, loyalty = true }: Props) {
  const cart = useCart();
  const state = useCafeState();
  const clock = useMinuteClock();
  const pricing = useMemo(() => pricingFor(state), [state]);
  const [step, setStep] = useState<Step>(0);
  const [done, setDone] = useState<{ order: Order; link: string } | null>(null);
  const [useFree, setUseFree] = useState(true);
  const [pickup, setPickup] = useState<{ date: string; time: string } | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const headRef = useRef<HTMLHeadingElement>(null);

  const now = clock > 0 ? tashkentNow(clock) : null;
  const plan: PickupPlan | null = now ? planPickup(now, hours) : null;
  const today = now?.iso ?? "";

  const lines = cart.lines;
  const subtotal = cartSubtotal(lines, pricing);
  const freeAvailable = loyalty && freeCupReady(state.stamps) && lines.some((l) => isCoffee(l.itemId));
  const discount = freeAvailable && useFree ? freeCupDiscount(lines, pricing, isCoffee) : 0;
  const total = subtotal - discount;

  // Фокус на заголовок шага при смене шага: экранный диктор объявит, где мы.
  useEffect(() => {
    headRef.current?.focus();
  }, [step, done]);

  const go = (next: Step) => {
    setError(null);
    setStep(next);
  };

  const toTime = () => {
    // Выбор по умолчанию — первый быстрый вариант (самый частый сценарий «через 10 минут»).
    if (!pickup && plan) {
      const first = plan.quick[0]?.time ?? plan.slots[0];
      if (first) setPickup({ date: plan.date, time: first });
    }
    go(1);
  };

  const toContacts = () => {
    if (!plan || !pickup || !isValidPickup(plan, pickup.time)) {
      setError(pick(ui.cart.pickupError, locale));
      return;
    }
    go(2);
  };

  const send = () => {
    const digits = phone.replace(/\D/g, "");
    if (name.trim().length < 2) return setError(pick(ui.cart.nameError, locale));
    if (digits.length < MIN_PHONE_DIGITS) return setError(pick(ui.cart.phoneError, locale));
    if (!pickup) return go(1);
    // Позиции, которые владелец успел снять («нет сегодня», скрыто, закончилось), убираем и возвращаем в корзину.
    const live = lines.filter((l) => {
      const item = itemById(l.itemId);
      return item && effective(item, state).orderable;
    });
    if (live.length !== lines.length) {
      cartStore.setLines(live);
      setError(pick(ui.cart.stockError, locale));
      return setStep(0);
    }
    const redeem = discount > 0;
    const order = demo.addOrder(
      {
        name: name.trim(),
        phone: phone.trim(),
        lines: lines.map((l) => ({ itemId: l.itemId, qty: l.qty, unit: lineUnit(l, pricing), sel: l.sel })),
        total,
        pickupDate: pickup.date,
        pickupTime: pickup.time,
        free: redeem,
      },
      redeem,
    );
    if (!order) {
      setError(pick(ui.cart.stockError, locale));
      return setStep(0);
    }
    const text = buildOrderText({
      shop,
      lines: lines.map((l) => ({ name: pick(itemById(l.itemId)?.name ?? { ru: l.itemId, en: l.itemId, uz: l.itemId }, locale), qty: l.qty, opts: optionWords(l.itemId, l.sel, locale), sum: formatSum(lineUnit(l, pricing) * l.qty, locale) })),
      total: formatSum(total, locale),
      pickupLabel: pickupLabel(pickup.date, pickup.time, today, locale),
      pickupWord: pick(ui.tgWords.pickup, locale),
      totalWord: pick(ui.tgWords.total, locale),
      name: name.trim(),
      phone: phone.trim(),
    });
    const link = telegramLink(telegram, text);
    cartStore.clear();
    setDone({ order, link });
    if (mode === "telegram") window.open(link, "_blank", "noopener,noreferrer");
  };

  if (done) return <Done locale={locale} order={done.order} link={done.link} today={today} headRef={headRef} loyalty={loyalty} />;

  return (
    <>
      <header className="cf-cart-head">
        <h2 ref={headRef} tabIndex={-1}>
          {pick(ui.cart.title, locale)}
        </h2>
        <button type="button" className="cf-x" onClick={() => cartStore.closeCart()} aria-label={pick(ui.cart.close, locale)}>
          <IconClose />
        </button>
      </header>
      <ol className="cf-steps" aria-label={pick(ui.cart.stepsLabel, locale)}>
        {STEPS.map((k, i) => (
          <li key={k} data-state={i < step ? "done" : i === step ? "now" : "next"} aria-current={i === step ? "step" : undefined}>
            <span className="cf-step-dot">{i < step ? <IconCheck /> : <i />}</span>
            {pick(ui.cart.steps[k], locale)}
          </li>
        ))}
      </ol>

      <div className="cf-cart-main" aria-live="polite">
        {error && (
          <p className="cf-error" role="alert">
            {error}
          </p>
        )}
        {step === 0 && <LinesStep locale={locale} lines={lines} />}
        {step === 0 && freeAvailable && (
          <label className="cf-free">
            <input type="checkbox" checked={useFree} onChange={(e) => setUseFree(e.target.checked)} />
            <span>{pick(ui.cart.freeCup, locale)}</span>
            {discount > 0 && <b>{fill(pick(ui.cart.freeCupOff, locale), { sum: formatSum(discount, locale) })}</b>}
          </label>
        )}
        {step === 1 && plan && <TimeStep locale={locale} plan={plan} today={today} pickup={pickup} onPick={(time, date) => setPickup({ date, time })} />}
        {step === 2 && (
          <div className="cf-form">
            <p className="cf-sum-line">
              {fill(pick(ui.cart.pickupAt, locale), { when: pickup ? pickupLabel(pickup.date, pickup.time, today, locale) : "" })}
            </p>
            <label>
              <span>{pick(ui.cart.name, locale)}</span>
              <input type="text" name="name" autoComplete="given-name" value={name} onChange={(e) => setName(e.target.value)} enterKeyHint="next" />
            </label>
            <label>
              <span>{pick(ui.cart.phone, locale)}</span>
              <input type="tel" name="phone" inputMode="tel" autoComplete="tel" placeholder="+998 90 123-45-67" value={phone} onChange={(e) => setPhone(e.target.value)} enterKeyHint="send" />
            </label>
            <p className="cf-note">{pick(ui.cart.payNote, locale)}</p>
          </div>
        )}
      </div>

      {lines.length > 0 && (
        <footer className="cf-cart-foot">
          <p className="cf-total">
            <span>{pick(ui.cart.total, locale)}</span>
            <b>{formatSum(total, locale)}</b>
          </p>
          <div className="cf-foot-btns">
            {step > 0 && (
              <button type="button" className="cf-ghost" onClick={() => go((step - 1) as Step)}>
                {pick(ui.cart.back, locale)}
              </button>
            )}
            {step === 0 && (
              <button type="button" className="cf-cta" onClick={toTime} disabled={cartCount(lines) === 0}>
                {pick(ui.cart.next, locale)}
              </button>
            )}
            {step === 1 && (
              <button type="button" className="cf-cta" onClick={toContacts}>
                {pick(ui.cart.next, locale)}
              </button>
            )}
            {step === 2 && (
              <button type="button" className="cf-cta" onClick={send}>
                <IconSend />
                {pick(ui.cart.send, locale)}
              </button>
            )}
          </div>
        </footer>
      )}
    </>
  );
}

function LinesStep({ locale, lines }: { locale: Locale; lines: CartLine[] }) {
  const state = useCafeState();
  const pricing = useMemo(() => pricingFor(state), [state]);
  if (lines.length === 0) {
    return (
      <div className="cf-empty">
        <p>{pick(ui.cart.empty, locale)}</p>
        <button type="button" className="cf-cta" onClick={() => cartStore.closeCart()}>
          {pick(ui.cart.toMenu, locale)}
        </button>
      </div>
    );
  }
  return (
    <ul className="cf-lines">
      {lines.map((l) => {
        const item = itemById(l.itemId);
        if (!item) return null;
        const e = effective(item, state);
        const maxMore = e.stock === undefined ? Infinity : e.stock - qtyOfItem(lines, item.id);
        const opts = optionWords(l.itemId, l.sel, locale);
        return (
          <li key={l.key} className="cf-line">
            <span className="cf-line-ph">{photoOf(item) ? <Photo name={photoOf(item)!} widths={[240]} src={240} width={240} height={240} sizes="56px" /> : <Glyph kind={item.glyph} />}</span>
            <span className="cf-line-main">
              <b>{pick(item.name, locale)}</b>
              {opts && <small>{opts}</small>}
              <span className="cf-line-sum">{formatSum(lineUnit(l, pricing) * l.qty, locale)}</span>
            </span>
            <span className="cf-stepper">
              <button type="button" onClick={() => cartStore.setQty(l.key, l.qty - 1)} aria-label={`${pick(l.qty === 1 ? ui.cart.remove : ui.cart.less, locale)}: ${pick(item.name, locale)}`}>
                <IconMinus />
              </button>
              <b aria-live="polite">{l.qty}</b>
              <button type="button" onClick={() => cartStore.setQty(l.key, l.qty + 1)} disabled={maxMore < 1} aria-label={`${pick(ui.cart.more, locale)}: ${pick(item.name, locale)}`}>
                <IconPlus />
              </button>
            </span>
          </li>
        );
      })}
    </ul>
  );
}

function TimeStep({ locale, plan, today, pickup, onPick }: { locale: Locale; plan: PickupPlan; today: string; pickup: { date: string; time: string } | null; onPick: (time: string, date: string) => void }) {
  const selected = pickup?.time;
  return (
    <div className="cf-time">
      <h3>{pick(ui.cart.pickupTitle, locale)}</h3>
      {!plan.openNow && <p className="cf-note">{fill(pick(ui.cart.closedNote, locale), { when: pickupLabel(plan.date, plan.slots[0] ?? "", today, locale) })}</p>}
      {plan.quick.length > 0 && (
        <div className="cf-chips big" role="radiogroup" aria-label={pick(ui.cart.pickupTitle, locale)}>
          {plan.quick.map((q) => (
            <button key={q.minutes} type="button" role="radio" aria-checked={selected === q.time} className="cf-chip" onClick={() => onPick(q.time, plan.date)}>
              {fill(pick(ui.cart.quick, locale), { n: q.minutes })}
              <small>{q.time}</small>
            </button>
          ))}
        </div>
      )}
      <h3 className="cf-sub">{pick(ui.cart.orTime, locale)}</h3>
      <div className="cf-slots" role="radiogroup" aria-label={pick(ui.cart.pickTime, locale)}>
        {plan.slots.map((s) => (
          <button key={s} type="button" role="radio" aria-checked={selected === s} className="cf-chip" onClick={() => onPick(s, plan.date)}>
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}

function Done({ locale, order, link, today, headRef, loyalty }: { locale: Locale; order: Order; link: string; today: string; headRef: React.RefObject<HTMLHeadingElement | null>; loyalty: boolean }) {
  return (
    <div className="cf-done">
      <span className="cf-done-mark" aria-hidden="true">
        <IconCheck />
      </span>
      <h2 ref={headRef} tabIndex={-1}>
        {pick(ui.done.title, locale)}
      </h2>
      <p className="cf-done-when">{fill(pick(ui.done.pickup, locale), { when: pickupLabel(order.pickupDate, order.pickupTime, today, locale) })}</p>
      {loyalty && <p className="cf-done-stamp">{pick(order.free ? ui.done.redeemed : ui.done.stamp, locale)}</p>}
      <a className="cf-cta" href={link} target="_blank" rel="noopener noreferrer">
        <IconSend />
        {pick(ui.done.telegram, locale)}
      </a>
      <button type="button" className="cf-ghost" onClick={() => cartStore.closeCart()}>
        {pick(ui.done.close, locale)}
      </button>
      {loyalty && <p className="cf-note">{pick(ui.done.demo, locale)}</p>}
    </div>
  );
}
