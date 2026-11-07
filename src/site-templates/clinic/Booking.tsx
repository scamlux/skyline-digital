"use client";

import { useEffect, useRef, useState } from "react";
import { useMinuteClock } from "../kit/hooks";
import { addDays, dayOfMonth, formatDate, tashkentNow, weekdayOf } from "../kit/tashkent";
import { pick, type Locale } from "../types";
import { fill } from "./format";
import { planDraft, usePlanDraft } from "./plan-store";
import { calcPlan, doctorsFor, slotsForDay, type ScheduleData, type Slot } from "./schedule";
import { demo, useClinicState } from "./store";
import { clinicUi as ui } from "./ui";

/** Сколько ближайших дней показываем в выборе даты. */
const DAYS_AHEAD = 7;

export interface BookingDoctor {
  id: string;
  name: string;
  role: string;
}

type Errors = Partial<Record<"service" | "time" | "name" | "phone", string>>;

interface Done {
  url: string;
  service: string;
  doctor: string;
  when: string;
}

/**
 * Запись к врачу: услуга → врач (или любой) → день (7 дней, воскресенье закрыто) → время
 * (сетка по 30 минут, часть занята) → имя и телефон. Сетка считается той же функцией, что и
 * карточка «ближайшее окно» и кабинет: график врачей и уже сделанные записи учитываются.
 * mode "demo" — подтверждение и кнопка со ссылкой на Telegram (без автооткрытия окна);
 * mode "telegram" — сразу открывает чат клиники с готовым текстом.
 */
export function BookingForm({
  mode,
  telegram,
  clinic,
  sched,
  services,
  doctors,
  locale,
}: {
  mode: "demo" | "telegram";
  telegram: string;
  clinic: string;
  sched: ScheduleData;
  services: { id: string; name: string }[];
  doctors: BookingDoctor[];
  locale: Locale;
}) {
  const f = ui.form;
  const state = useClinicState();
  const clock = useMinuteClock();
  const draft = usePlanDraft();
  const ov = { services: state.services, schedule: state.schedule };
  const now = clock > 0 ? tashkentNow(clock) : null;

  const [pickedService, setPickedService] = useState<string | null>(null);
  const [pickedDoctor, setPickedDoctor] = useState<string>("any");
  const [pickedDate, setPickedDate] = useState<string | null>(null);
  const [pickedTime, setPickedTime] = useState<string | null>(null);
  const [planItems, setPlanItems] = useState<{ id: string; qty: number }[]>([]);
  const [seenNonce, setSeenNonce] = useState(0);
  const [errors, setErrors] = useState<Errors>({});
  const [done, setDone] = useState<Done | null>(null);
  const successRef = useRef<HTMLHeadingElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const wasDone = useRef(false);

  // План из калькулятора / предвыбор из карточки услуги или врача. Обновление состояния во время
  // рендера (а не в эффекте) — штатный приём React для «подхватить новое значение пропса».
  if (draft.nonce !== seenNonce) {
    setSeenNonce(draft.nonce);
    setPlanItems(draft.items);
    setPickedService(draft.serviceId);
    setPickedDoctor(draft.doctorId ?? "any");
    setPickedTime(null);
    setDone(null);
  }

  // Услуги, которые владелец не скрыл и которые кто-то ведёт.
  const visible = services.filter((s) => {
    const base = sched.services.find((x) => x.id === s.id);
    return base && !state.services[s.id]?.hidden && doctorsFor(sched, s.id).length > 0;
  });
  // План без скрытых услуг (владелец мог скрыть услугу уже после расчёта).
  const plan = calcPlan(sched, ov, planItems);
  const serviceId = visible.some((s) => s.id === pickedService) ? pickedService! : (visible[0]?.id ?? "");
  const pool = doctors.filter((d) => doctorsFor(sched, serviceId).some((x) => x.id === d.id));
  const doctorId = pool.some((d) => d.id === pickedDoctor) ? pickedDoctor : "any";

  const dates = now ? Array.from({ length: DAYS_AHEAD }, (_, i) => addDays(now.iso, i)) : [];
  // Сетка слотов на каждый из ближайших дней: от неё зависят доступность дат и список времени.
  const grids: Record<string, Slot[]> = now
    ? Object.fromEntries(
        dates.map((date) => [date, slotsForDay({ data: sched, ov, bookings: state.bookings, date, serviceId, doctorId, now })]),
      )
    : {};
  const hasFree = (date: string) => (grids[date] ?? []).some((s) => s.status === "free");
  const date = pickedDate && dates.includes(pickedDate) && hasFree(pickedDate) ? pickedDate : (dates.find(hasFree) ?? null);
  const slots = date ? (grids[date] ?? []) : [];
  const slot = slots.find((s) => s.time === pickedTime && s.status === "free") ?? null;

  const svcName = services.find((s) => s.id === serviceId)?.name ?? "";
  const docOf = (id: string | null) => doctors.find((d) => d.id === id)?.name ?? "";
  const planText = plan.items.map((it) => `${services.find((s) => s.id === it.id)?.name ?? it.id} ×${it.qty}`).join(", ");

  // Фокус: кнопка, на которой стоял фокус, исчезает при смене состояния — переносим сами.
  useEffect(() => {
    if (done) successRef.current?.focus();
    else if (wasDone.current) formRef.current?.querySelector<HTMLElement>("[name=name]")?.focus();
    wasDone.current = !!done;
  }, [done]);

  function weekdayLabel(iso: string) {
    return formatDate(iso, locale, { weekday: "short" });
  }

  function dayNote(iso: string): string {
    const day = grids[iso] ?? [];
    if (sched.hours.closedDays.includes(weekdayOf(iso))) return pick(f.closed, locale);
    if (day.length === 0) return pick(f.dayOff, locale);
    if (!day.some((s) => s.status === "free")) return pick(f.noFree, locale);
    return iso === now?.iso ? pick(f.todayShort, locale) : "";
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const name = String(fd.get("name") ?? "").trim();
    const phone = String(fd.get("phone") ?? "").trim();
    const next: Errors = {};
    if (!serviceId) next.service = pick(f.errService, locale);
    if (!date || !slot?.doctorId) next.time = pick(f.errTime, locale);
    if (name.length < 2) next.name = pick(f.errName, locale);
    if (phone.replace(/\D/g, "").length < 9) next.phone = pick(f.errPhone, locale);
    setErrors(next);
    const first = (["time", "name", "phone"] as const).find((k) => next[k]);
    if (first || !date || !slot?.doctorId) {
      if (first) e.currentTarget.querySelector<HTMLElement>(first === "time" ? "[data-first-time]" : `[name="${first}"]`)?.focus();
      return;
    }
    const booked = demo.addBooking({
      name,
      phone,
      serviceId,
      doctorId: slot.doctorId,
      anyDoctor: doctorId === "any",
      date,
      time: slot.time,
      plan: planText || undefined,
    });
    if (!booked) {
      // Слот успел занять другой посетитель (две вкладки): сетка уже пересчиталась — просим выбрать другое.
      setPickedTime(null);
      setErrors({ time: pick(f.errBusy, locale) });
      return;
    }
    const doctor = docOf(slot.doctorId);
    const when = `${formatDate(date, locale, { weekday: "long", day: "numeric", month: "long" })}, ${slot.time}`;
    const text = [
      `${pick(f.messageHead, locale)} · ${clinic}`,
      `${name}, ${phone}`,
      `${pick(f.messageService, locale)}: ${svcName}`,
      `${pick(f.messageDoctor, locale)}: ${doctor}`,
      when,
      planText ? `${pick(f.messagePlan, locale)}: ${planText}` : "",
    ]
      .filter(Boolean)
      .join("\n");
    const url = `https://t.me/${telegram}?text=${encodeURIComponent(text)}`;
    // В режиме telegram чат открываем сами; в демо — только кнопка в подтверждении (новая вкладка
    // увела бы посетителя из демо). Если окно заблокировано, ссылка всё равно остаётся на экране.
    if (mode === "telegram") window.open(url, "_blank", "noopener");
    setDone({ url, service: svcName, doctor, when });
    planDraft.clear();
  }

  if (done) {
    return (
      <div className="tpl-success" role="status">
        <h3 ref={successRef} tabIndex={-1}>
          {pick(f.successTitle, locale)}
        </h3>
        <dl className="tpl-success-card">
          <div>
            <dt>{pick(f.stepService, locale)}</dt>
            <dd>{done.service}</dd>
          </div>
          <div>
            <dt>{pick(f.stepDoctor, locale)}</dt>
            <dd>{done.doctor}</dd>
          </div>
          <div>
            <dt>{pick(f.stepTime, locale)}</dt>
            <dd>{done.when}</dd>
          </div>
        </dl>
        <p>{pick(f.successText, locale)}</p>
        {mode === "demo" && <p className="tpl-note">{pick(f.demoNote, locale)}</p>}
        <a className="tpl-btn" href={done.url} target="_blank" rel="noopener noreferrer">
          {pick(f.openTelegram, locale)}
        </a>
        <p className="tpl-note">{pick(f.openTelegramHint, locale)}</p>
        <button
          type="button"
          className="tpl-btn ghost"
          onClick={() => {
            setDone(null);
            setPickedTime(null);
          }}
        >
          {pick(f.again, locale)}
        </button>
      </div>
    );
  }

  return (
    <form ref={formRef} className="tpl-form tpl-booking" onSubmit={onSubmit} noValidate>
      {plan.items.length > 0 && (
        <div className="tpl-plan" role="note">
          <div>
            <b>{pick(f.planTitle, locale)}</b>
            <span>{planText}</span>
          </div>
          <button type="button" className="tpl-link" onClick={() => setPlanItems([])}>
            {pick(f.planClear, locale)}
          </button>
        </div>
      )}

      <fieldset className="tpl-step">
        <legend>
          <i aria-hidden="true">1</i> {pick(f.stepService, locale)}
        </legend>
        <div className="tpl-chipset">
          {visible.map((s) => (
            <button key={s.id} type="button" aria-pressed={s.id === serviceId} onClick={() => setPickedService(s.id)}>
              {s.name}
            </button>
          ))}
        </div>
        {errors.service && <p className="tpl-err">{errors.service}</p>}
      </fieldset>

      <fieldset className="tpl-step">
        <legend>
          <i aria-hidden="true">2</i> {pick(f.stepDoctor, locale)}
        </legend>
        <div className="tpl-docset">
          <button type="button" aria-pressed={doctorId === "any"} onClick={() => setPickedDoctor("any")}>
            <b>{pick(f.anyDoctor, locale)}</b>
            <small>{pick(f.anyDoctorHint, locale)}</small>
          </button>
          {pool.map((d) => (
            <button key={d.id} type="button" aria-pressed={doctorId === d.id} onClick={() => setPickedDoctor(d.id)}>
              <b>{d.name}</b>
              <small>{d.role}</small>
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset className="tpl-step">
        <legend>
          <i aria-hidden="true">3</i> {pick(f.stepDate, locale)}
        </legend>
        <div className="tpl-dates">
          {dates.length === 0 && <span className="tpl-dates-skel" aria-hidden="true" />}
          {dates.map((d) => {
            const off = !hasFree(d);
            return (
              <button key={d} type="button" aria-pressed={d === date} disabled={off} onClick={() => setPickedDate(d)} aria-label={`${formatDate(d, locale, { weekday: "long", day: "numeric", month: "long" })}${dayNote(d) ? `, ${dayNote(d)}` : ""}`}>
                <small>{weekdayLabel(d)}</small>
                <b>{dayOfMonth(d)}</b>
                <em>{dayNote(d) || " "}</em>
              </button>
            );
          })}
        </div>
      </fieldset>

      <fieldset className="tpl-step">
        <legend>
          <i aria-hidden="true">4</i> {pick(f.stepTime, locale)}
        </legend>
        {date && slots.length > 0 ? (
          <div className="tpl-slots">
            {slots.map((s, i) => {
              const free = s.status === "free";
              return (
                <button
                  key={s.time}
                  type="button"
                  disabled={!free}
                  aria-pressed={free && s.time === slot?.time}
                  data-state={s.status}
                  {...(i === slots.findIndex((x) => x.status === "free") ? { "data-first-time": "" } : {})}
                  aria-label={free ? s.time : `${s.time}, ${pick(f.taken, locale)}`}
                  onClick={() => setPickedTime(s.time)}
                >
                  {s.time}
                </button>
              );
            })}
          </div>
        ) : (
          <p className="tpl-note">{pick(f.noSlots, locale)}</p>
        )}
        {errors.time && (
          <p className="tpl-err" role="alert">
            {errors.time}
          </p>
        )}
      </fieldset>

      <fieldset className="tpl-step">
        <legend>
          <i aria-hidden="true">5</i> {pick(f.stepContact, locale)}
        </legend>
        <div className="tpl-row">
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
        </div>
      </fieldset>

      {slot && date && (
        <p className="tpl-summary">
          {fill(pick(f.summary, locale), {
            what: `${svcName} · ${docOf(slot.doctorId)} · ${formatDate(date, locale, { weekday: "short", day: "numeric", month: "short" })}, ${slot.time}`,
          })}
        </p>
      )}
      <button type="submit" className="tpl-btn">
        {pick(f.submit, locale)}
      </button>
      <p className="tpl-note">{pick(f.consent, locale)}</p>
    </form>
  );
}
