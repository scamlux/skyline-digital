"use client";

import { useEffect, useRef, useState } from "react";
import { useMinuteClock } from "../kit/hooks";
import { addDays, dayOfMonth, formatDate, tashkentNow } from "../kit/tashkent";
import { formatSum, pick } from "../types";
import { useOverrides } from "./client-bits";
import { useSalon } from "./context";
import { CATEGORIES } from "./data";
import { bookingDraft, useBookingDraft } from "./draft-store";
import { fill, formatMinutes, whenLabel } from "./format";
import { basketOf, effectiveService, masterDays, mastersFor, slotsForDay, type Slot } from "./schedule";
import { demo, useSalonState } from "./store";
import { salonUi as ui } from "./ui";

/** Сколько ближайших дней показываем в выборе даты. */
const DAYS_AHEAD = 7;
const MIN_PHONE_DIGITS = 9;
const MIN_NAME_LENGTH = 2;

type Errors = Partial<Record<"service" | "time" | "name" | "phone", string>>;

interface Done {
  url: string;
  services: string;
  master: string;
  when: string;
  total: string;
}

/**
 * Запись онлайн: услуги (можно несколько, сумма и время считаются на лету) → мастер или любой →
 * день (7 дней, салон работает ежедневно) → время (сетка по 30 минут, длина записи = сумма
 * услуг, часть окон занята) → имя и телефон. Сетка считается той же функцией, что и карточки
 * «ближайшее окно»: график мастеров, чужие и свои записи учитываются. Режим "demo" показывает
 * подтверждение и кнопку со ссылкой в Telegram; "telegram" открывает чат сразу.
 */
export function BookingForm() {
  const { locale, name: salon, telegram, mode, sched, services, masters, looks } = useSalon();
  const state = useSalonState();
  const ov = useOverrides();
  const draft = useBookingDraft();
  const clock = useMinuteClock();
  const now = clock > 0 ? tashkentNow(clock) : null;

  const [picked, setPicked] = useState<string[] | null>(null);
  const [pickedMaster, setPickedMaster] = useState("any");
  const [pickedDate, setPickedDate] = useState<string | null>(null);
  const [pickedTime, setPickedTime] = useState<string | null>(null);
  const [lookId, setLookId] = useState<string | null>(null);
  const [seenNonce, setSeenNonce] = useState(0);
  const [errors, setErrors] = useState<Errors>({});
  const [done, setDone] = useState<Done | null>(null);
  const successRef = useRef<HTMLHeadingElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const wasDone = useRef(false);

  // Предвыбор из лукбука / подбора образа / карточки мастера. Обновление состояния во время
  // рендера (а не в эффекте) — штатный приём React для «подхватить новое значение пропса».
  if (draft.nonce !== seenNonce) {
    setSeenNonce(draft.nonce);
    setPicked(draft.serviceIds.length > 0 ? draft.serviceIds : null);
    setPickedMaster(draft.masterId ?? "any");
    setLookId(draft.lookId);
    setPickedTime(null);
    setDone(null);
  }

  // Услуги, которые владелец не скрыл и которые кто-то ведёт.
  const visible = services.filter((s) => !ov.services[s.id]?.hidden && mastersFor(sched, [s.id]).length > 0);
  const ids = (picked ?? (visible[0] ? [visible[0].id] : [])).filter((id) => visible.some((s) => s.id === id));
  const basket = basketOf(sched, ov, ids);
  const able = mastersFor(sched, basket.ids);
  const masterId = pickedMaster !== "any" && able.some((m) => m.id === pickedMaster) ? pickedMaster : "any";

  const dates = now ? Array.from({ length: DAYS_AHEAD }, (_, i) => addDays(now.iso, i)) : [];
  const grids: Record<string, Slot[]> = {};
  if (now && basket.ids.length > 0) {
    for (const d of dates) grids[d] = slotsForDay({ data: sched, ov, bookings: state.bookings, date: d, serviceIds: basket.ids, masterId, now });
  }

  const firstOpenDate = dates.find((d) => grids[d]?.some((s) => s.status === "free"));
  const date = pickedDate && dates.includes(pickedDate) ? pickedDate : (firstOpenDate ?? dates[0] ?? null);
  const slots = date ? (grids[date] ?? []) : [];
  const slot = slots.find((s) => s.time === pickedTime && s.status === "free") ?? null;
  const masterName = (id: string | null) => masters.find((m) => m.id === id)?.name ?? "";
  const nameOf = (id: string) => services.find((s) => s.id === id)?.name ?? id;

  // Фокус: кнопка, на которой стоял фокус, исчезает при смене состояния — переносим сами.
  useEffect(() => {
    if (done) successRef.current?.focus();
    else if (wasDone.current) formRef.current?.querySelector<HTMLElement>("[name=name]")?.focus();
    wasDone.current = !!done;
  }, [done]);

  function toggle(id: string) {
    setPicked(ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]);
    setPickedTime(null);
  }

  function dayNote(iso: string): string {
    const day = grids[iso] ?? [];
    if (basket.ids.length === 0) return "";
    if (day.length === 0) return pick(ui.form.dayOff, locale);
    if (!day.some((s) => s.status === "free")) return pick(ui.form.noFree, locale);
    return now && iso === now.iso ? pick(ui.form.todayShort, locale) : "";
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const name = String(fd.get("name") ?? "").trim();
    const phone = String(fd.get("phone") ?? "").trim();
    const next: Errors = {};
    if (basket.ids.length === 0) next.service = pick(able.length === 0 && ids.length > 1 ? ui.form.errMaster : ui.form.errService, locale);
    else if (able.length === 0) next.service = pick(ui.form.errMaster, locale);
    if (!date || !slot?.masterId) next.time = pick(ui.form.errTime, locale);
    if (name.length < MIN_NAME_LENGTH) next.name = pick(ui.form.errName, locale);
    if (phone.replace(/\D/g, "").length < MIN_PHONE_DIGITS) next.phone = pick(ui.form.errPhone, locale);
    setErrors(next);
    if (Object.keys(next).length > 0 || !date || !slot?.masterId || !now) {
      const first = formRef.current?.querySelector<HTMLElement>("[data-invalid=true]");
      first?.focus();
      return;
    }

    const saved = demo.addBooking({ name, phone, serviceIds: basket.ids, masterId: slot.masterId, anyMaster: masterId === "any", date, time: slot.time, minutes: basket.minutes, total: basket.price, lookId: lookId ?? undefined });
    if (!saved) {
      setErrors({ time: pick(ui.form.errBusy, locale) });
      setPickedTime(null);
      return;
    }
    const servicesText = basket.ids.map(nameOf).join(" + ");
    const when = whenLabel(date, slot.time, now.iso, locale);
    const text = fill(pick(ui.form.tgText, locale), { salon, services: servicesText, master: masterName(slot.masterId), when: `${formatDate(date, locale, { day: "numeric", month: "long" })}, ${slot.time}`, total: formatSum(basket.price, locale), name, phone });
    const url = `https://t.me/${telegram}?text=${encodeURIComponent(text)}`;
    // В режиме telegram чат открываем сами; в демо — только кнопка в подтверждении (новая вкладка
    // увела бы посетителя из демо). Если окно заблокировано, ссылка всё равно остаётся на экране.
    if (mode === "telegram") window.open(url, "_blank", "noopener");
    setDone({ url, services: servicesText, master: masterName(slot.masterId), when, total: `${formatSum(basket.price, locale)} · ${formatMinutes(basket.minutes, locale)}` });
    bookingDraft.clear();
  }

  if (done) {
    return (
      <div className="sl-success" role="status">
        <h3 ref={successRef} tabIndex={-1}>
          {pick(ui.form.successTitle, locale)}
        </h3>
        <dl className="sl-success-card">
          <div>
            <dt>{pick(ui.form.summaryServices, locale)}</dt>
            <dd>{done.services}</dd>
          </div>
          <div>
            <dt>{pick(ui.form.summaryMaster, locale)}</dt>
            <dd>{done.master}</dd>
          </div>
          <div>
            <dt>{pick(ui.form.summaryWhen, locale)}</dt>
            <dd>{done.when}</dd>
          </div>
          <div>
            <dt>{pick(ui.form.summaryTotal, locale)}</dt>
            <dd>{done.total}</dd>
          </div>
        </dl>
        <p>{pick(ui.form.successText, locale)}</p>
        {mode === "demo" && <p className="sl-note">{pick(ui.form.demoNote, locale)}</p>}
        <a className="sl-btn" href={done.url} target="_blank" rel="noopener noreferrer">
          {pick(ui.form.openTelegram, locale)}
        </a>
        <p className="sl-note">{pick(ui.form.openTelegramHint, locale)}</p>
        <button
          type="button"
          className="sl-btn ghost"
          onClick={() => {
            setDone(null);
            setPickedTime(null);
          }}
        >
          {pick(ui.form.again, locale)}
        </button>
      </div>
    );
  }

  const lookTitle = lookId ? looks.find((l) => l.id === lookId)?.title : null;
  const basketText = basket.ids.length > 0 ? `${formatSum(basket.price, locale)} · ${formatMinutes(basket.minutes, locale)}` : pick(ui.form.basketEmpty, locale);

  return (
    <form ref={formRef} className="sl-form" onSubmit={onSubmit} noValidate>
      {lookTitle && <p className="sl-form-look">{fill(pick(ui.form.fromLook, locale), { look: lookTitle })}</p>}

      <fieldset className="sl-step">
        <legend>
          <i aria-hidden="true">1</i> {pick(ui.form.stepServices, locale)}
        </legend>
        {CATEGORIES.map((cat) => {
          const list = visible.filter((s) => s.cat === cat);
          if (list.length === 0) return null;
          return (
            <div key={cat} className="sl-chk-group">
              <p>{pick(ui.services[cat], locale)}</p>
              <div className="sl-chks">
                {list.map((s, idx) => {
                  const eff = effectiveService({ id: s.id, minutes: s.minutes, price: s.price }, ov);
                  return (
                    <label key={s.id} className="sl-chk">
                      <input type="checkbox" checked={ids.includes(s.id)} onChange={() => toggle(s.id)} {...(cat === CATEGORIES[0] && idx === 0 ? { "data-invalid": errors.service ? "true" : undefined } : {})} />
                      <span>
                        <b>{s.name}</b>
                        <small>
                          {formatMinutes(eff.minutes, locale)} · {formatSum(eff.price, locale)}
                        </small>
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          );
        })}
        <p className="sl-basket" role="status" aria-label={pick(ui.form.basketLabel, locale)}>
          <span>{pick(ui.form.basket, locale)}</span> <b>{basketText}</b>
        </p>
        {basket.ids.length > 0 && able.length === 0 && <p className="sl-err">{pick(ui.form.noMaster, locale)}</p>}
        {errors.service && (
          <p className="sl-err" role="alert">
            {errors.service}
          </p>
        )}
      </fieldset>

      <fieldset className="sl-step">
        <legend>
          <i aria-hidden="true">2</i> {pick(ui.form.stepMaster, locale)}
        </legend>
        <div className="sl-masters-pick">
          <label className="sl-radio">
            <input type="radio" name="master" checked={masterId === "any"} onChange={() => (setPickedMaster("any"), setPickedTime(null))} />
            <span>
              <b>{pick(ui.form.anyMaster, locale)}</b>
              <small>{pick(ui.form.anyMasterHint, locale)}</small>
            </span>
          </label>
          {able.map((m) => (
            <label key={m.id} className="sl-radio">
              <input type="radio" name="master" checked={masterId === m.id} disabled={masterDays(m, ov).length === 0} onChange={() => (setPickedMaster(m.id), setPickedTime(null))} />
              <span>
                <b>{masters.find((x) => x.id === m.id)?.name}</b>
                <small>{masterDays(m, ov).length === 0 ? pick(ui.masters.dayOff, locale) : masters.find((x) => x.id === m.id)?.role}</small>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="sl-step">
        <legend>
          <i aria-hidden="true">3</i> {pick(ui.form.stepDay, locale)}
        </legend>
        <div className="sl-days">
          {dates.map((d) => {
            const note = dayNote(d);
            const off = basket.ids.length > 0 && !(grids[d] ?? []).some((s) => s.status === "free");
            return (
              <button key={d} type="button" aria-pressed={d === date} disabled={off} onClick={() => (setPickedDate(d), setPickedTime(null))} aria-label={`${formatDate(d, locale, { weekday: "long", day: "numeric", month: "long" })}${note ? `, ${note}` : ""}`}>
                <small>{formatDate(d, locale, { weekday: "short" })}</small>
                <b>{dayOfMonth(d)}</b>
                <em>{note || " "}</em>
              </button>
            );
          })}
          {dates.length === 0 && <p className="sl-note">{pick(ui.form.loadingSlots, locale)}</p>}
        </div>
      </fieldset>

      <fieldset className="sl-step">
        <legend>
          <i aria-hidden="true">4</i> {pick(ui.form.stepTime, locale)}
        </legend>
        {date && slots.length > 0 ? (
          <div className="sl-slots">
            {slots.map((s) => {
              const free = s.status === "free";
              return (
                <button key={s.time} type="button" disabled={!free} aria-pressed={free && s.time === slot?.time} data-state={s.status} aria-label={free ? s.time : `${s.time}, ${pick(ui.form.taken, locale)}`} onClick={() => setPickedTime(s.time)}>
                  {s.time}
                </button>
              );
            })}
          </div>
        ) : (
          <p className="sl-note">{pick(dates.length === 0 ? ui.form.loadingSlots : ui.form.noSlots, locale)}</p>
        )}
        {errors.time && (
          <p className="sl-err" role="alert">
            {errors.time}
          </p>
        )}
      </fieldset>

      <fieldset className="sl-step">
        <legend>
          <i aria-hidden="true">5</i> {pick(ui.form.stepContact, locale)}
        </legend>
        <div className="sl-row">
          <div className="sl-field">
            <label htmlFor="sl-name">{pick(ui.form.name, locale)}</label>
            <input id="sl-name" name="name" type="text" autoComplete="name" aria-invalid={!!errors.name} data-invalid={errors.name ? "true" : undefined} aria-describedby={errors.name ? "sl-name-err" : undefined} />
            {errors.name && (
              <p className="sl-err" id="sl-name-err" role="alert">
                {errors.name}
              </p>
            )}
          </div>
          <div className="sl-field">
            <label htmlFor="sl-phone">{pick(ui.form.phone, locale)}</label>
            <input id="sl-phone" name="phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="+998" aria-invalid={!!errors.phone} data-invalid={errors.phone ? "true" : undefined} aria-describedby={errors.phone ? "sl-phone-err" : undefined} />
            {errors.phone && (
              <p className="sl-err" id="sl-phone-err" role="alert">
                {errors.phone}
              </p>
            )}
          </div>
        </div>
        <button type="submit" className="sl-btn big">
          {pick(ui.form.submit, locale)}
        </button>
      </fieldset>
    </form>
  );
}
