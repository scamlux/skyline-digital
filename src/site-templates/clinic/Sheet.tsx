"use client";

import { useEffect, useRef, useState } from "react";
import { addDays, dayOfMonth, formatDate, weekdayOf } from "../kit/tashkent";
import { pick, type Locale } from "../types";
import { priceText } from "./format";
import { useLive } from "./live";
import { planDraft, usePlanDraft } from "./plan-store";
import { calcPlan, DAY_PARTS, dayPartOf, doctorsFor, effectiveService, slotsForDay, type DayPart, type ScheduleData, type Slot } from "./schedule";
import { demo } from "./store";
import { picksText } from "./teeth";
import { clinicUi as ui } from "./ui";

/** Сколько ближайших дней показываем в выборе даты. */
const DAYS_AHEAD = 7;
const IMG = "/templates/clinic/img";
/** Услуга первого визита, когда пришли с планом (карта зубов, пакет): осмотр, после него план. */
const PLAN_VISIT = "consult";

export interface SheetDoctor {
  id: string;
  name: string;
  role: string;
  photo: string;
}

type Step = 1 | 2 | 3;
type Errors = Partial<Record<"time" | "name" | "phone", string>>;
const PARTS = { morning: ui.sheet.partMorning, day: ui.sheet.partDay, evening: ui.sheet.partEvening } satisfies Record<DayPart, { ru: string; en: string; uz: string }>;

interface Done {
  url: string;
  what: string;
  doctor: string;
  when: string;
}

/**
 * Окно записи: три шага с индикатором (проблема → врач и время → контакты) и липкой сводкой с
 * планом, вилкой цены и временем. На телефоне открывается на всю высоту снизу, на десктопе —
 * панелью справа. Сетка слотов — та же функция, что у карточек «ближайшее окно» и кабинета.
 * mode "demo": подтверждение и ссылка на Telegram; "telegram": сразу открывает чат клиники.
 */
export function BookingSheet({
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
  doctors: SheetDoctor[];
  locale: Locale;
}) {
  const s = ui.sheet;
  const { state, ov, now } = useLive();
  const draft = usePlanDraft();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const successRef = useRef<HTMLHeadingElement>(null);

  const [step, setStep] = useState<Step>(1);
  const [pickedService, setPickedService] = useState<string | null>(null);
  const [pickedDoctor, setPickedDoctor] = useState<string>("any");
  const [pickedDate, setPickedDate] = useState<string | null>(null);
  const [pickedTime, setPickedTime] = useState<string | null>(null);
  const [part, setPart] = useState<DayPart | "all">("all");
  const [items, setItems] = useState(draft.items);
  const [teeth, setTeeth] = useState(draft.teeth);
  const [seenNonce, setSeenNonce] = useState(0);
  const [wasOpen, setWasOpen] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [done, setDone] = useState<Done | null>(null);

  // Новый выбор с сайта (плитка, зуб, пакет, врач) подхватываем во время рендера — штатный приём React.
  if (draft.nonce !== seenNonce) {
    setSeenNonce(draft.nonce);
    setItems(draft.items);
    setTeeth(draft.teeth);
    setPickedService(draft.serviceId);
    setPickedDoctor(draft.doctorId ?? "any");
    setPickedTime(null);
    setStep(1);
    setDone(null);
    setErrors({});
  }
  // После успешной записи окно при следующем открытии начинается заново.
  if (draft.open !== wasOpen) {
    setWasOpen(draft.open);
    if (draft.open && done && draft.nonce === seenNonce) {
      setDone(null);
      setStep(1);
      setPickedTime(null);
    }
  }

  const visible = services.filter((x) => {
    const base = sched.services.find((y) => y.id === x.id);
    return base && !state.services[x.id]?.hidden && doctorsFor(sched, x.id).length > 0;
  });
  const plan = calcPlan(sched, ov, items);
  const hasPlan = plan.items.length > 0;
  const planVisit = visible.some((x) => x.id === PLAN_VISIT) ? PLAN_VISIT : (visible[0]?.id ?? "");
  const serviceId = hasPlan ? planVisit : visible.some((x) => x.id === pickedService) ? pickedService! : (visible[0]?.id ?? "");
  const nameOf = (id: string) => services.find((x) => x.id === id)?.name ?? id;
  const pool = doctors.filter((d) => doctorsFor(sched, serviceId).some((x) => x.id === d.id));
  const doctorId = pool.some((d) => d.id === pickedDoctor) ? pickedDoctor : "any";
  const docOf = (id: string | null) => doctors.find((d) => d.id === id)?.name ?? "";

  const dates = now ? Array.from({ length: DAYS_AHEAD }, (_, i) => addDays(now.iso, i)) : [];
  const grids: Record<string, Slot[]> = now
    ? Object.fromEntries(dates.map((d) => [d, slotsForDay({ data: sched, ov, bookings: state.bookings, date: d, serviceId, doctorId, now })]))
    : {};
  const hasFree = (d: string) => (grids[d] ?? []).some((x) => x.status === "free");
  const date = pickedDate && dates.includes(pickedDate) && hasFree(pickedDate) ? pickedDate : (dates.find(hasFree) ?? null);
  const allSlots = date ? (grids[date] ?? []) : [];
  const slots = part === "all" ? allSlots : allSlots.filter((x) => dayPartOf(x.time) === part);
  const slot = allSlots.find((x) => x.time === pickedTime && x.status === "free") ?? null;

  const problemLabel = (k: string) => pick(ui.problems[k as keyof typeof ui.problems], locale);
  const planNames = plan.items.map((it) => `${nameOf(it.id)}${it.qty > 1 ? ` ×${it.qty}` : ""}`).join(", ");
  const teethNote = teeth.length > 0 ? ` (${picksText(teeth, problemLabel)})` : "";
  const planText = hasPlan ? `${planNames}${teethNote}` : "";
  const what = hasPlan ? planNames : nameOf(serviceId);

  const price = (() => {
    const w = { free: pick(ui.hero.free, locale), upTo: pick(ui.hero.upTo, locale) };
    if (hasPlan) return priceText(plan.min, plan.max, locale, w);
    const base = sched.services.find((x) => x.id === serviceId);
    if (!base) return "";
    const e = effectiveService(base, ov);
    return priceText(e.min, e.max, locale, w);
  })();
  const slotText = slot && date ? `${formatDate(date, locale, { weekday: "short", day: "numeric", month: "short" })}, ${slot.time}` : pick(s.notChosen, locale);

  // Диалог: showModal даёт ловушку фокуса и Esc; прокрутку страницы под ним блокируем сами.
  useEffect(() => {
    const d = dialogRef.current;
    if (!d) return;
    if (draft.open && !d.open) {
      d.showModal();
      document.documentElement.style.overflow = "hidden";
    }
    if (!draft.open && d.open) d.close();
    if (!draft.open) document.documentElement.style.overflow = "";
  }, [draft.open]);
  useEffect(() => () => void (document.documentElement.style.overflow = ""), []);

  // Смена шага: к началу тела окна; после успеха — фокус на заголовок.
  useEffect(() => {
    bodyRef.current?.scrollTo({ top: 0 });
  }, [step, done]);
  useEffect(() => {
    if (done) successRef.current?.focus();
  }, [done]);

  function goNext() {
    if (step === 2 && (!date || !slot?.doctorId)) {
      setErrors({ time: pick(s.errTime, locale) });
      return;
    }
    setErrors({});
    setStep((x) => (x === 1 ? 2 : 3));
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const name = String(fd.get("name") ?? "").trim();
    const phone = String(fd.get("phone") ?? "").trim();
    const next: Errors = {};
    if (!date || !slot?.doctorId) next.time = pick(s.errTime, locale);
    if (name.length < 2) next.name = pick(s.errName, locale);
    if (phone.replace(/\D/g, "").length < 9) next.phone = pick(s.errPhone, locale);
    setErrors(next);
    if (next.time) {
      setStep(2);
      return;
    }
    const first = (["name", "phone"] as const).find((k) => next[k]);
    if (first || !date || !slot?.doctorId) {
      if (first) e.currentTarget.querySelector<HTMLElement>(`[name="${first}"]`)?.focus();
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
      teeth: teeth.length > 0 ? teeth : undefined,
    });
    if (!booked) {
      // Слот успел занять другой посетитель (две вкладки): сетка уже пересчиталась.
      setPickedTime(null);
      setErrors({ time: pick(s.errBusy, locale) });
      setStep(2);
      return;
    }
    const doctor = docOf(slot.doctorId);
    const when = `${formatDate(date, locale, { weekday: "long", day: "numeric", month: "long" })}, ${slot.time}`;
    const text = [
      `${pick(s.messageHead, locale)} · ${clinic}`,
      `${name}, ${phone}`,
      `${pick(s.messageService, locale)}: ${nameOf(serviceId)}`,
      `${pick(s.messageDoctor, locale)}: ${doctor}`,
      when,
      planText ? `${pick(s.messagePlan, locale)}: ${planText}` : "",
    ]
      .filter(Boolean)
      .join("\n");
    const url = `https://t.me/${telegram}?text=${encodeURIComponent(text)}`;
    // В режиме telegram чат открываем сами; в демо — только кнопка в подтверждении (новая вкладка
    // увела бы посетителя из демо). Если окно заблокировано, ссылка остаётся на экране.
    if (mode === "telegram") window.open(url, "_blank", "noopener");
    setDone({ url, what, doctor, when });
    planDraft.clear();
    setItems([]);
    setTeeth([]);
  }

  const steps: { n: Step; label: string }[] = [
    { n: 1, label: pick(s.step1, locale) },
    { n: 2, label: pick(s.step2, locale) },
    { n: 3, label: pick(s.step3, locale) },
  ];
  const weekdayLabel = (iso: string) => formatDate(iso, locale, { weekday: "short" });
  const dayNote = (iso: string): string => {
    const day = grids[iso] ?? [];
    if (sched.hours.closedDays.includes(weekdayOf(iso))) return "";
    if (day.length === 0) return pick(s.dayOff, locale);
    if (!day.some((x) => x.status === "free")) return pick(s.noFree, locale);
    return iso === now?.iso ? pick(s.todayShort, locale) : "";
  };

  return (
    <dialog
      ref={dialogRef}
      className="cl-sheet"
      aria-labelledby="cl-sheet-title"
      onClose={() => planDraft.close()}
      onClick={(e) => {
        if (e.target === e.currentTarget) planDraft.close();
      }}
    >
      <div className="cl-sheet-in">
        <header className="cl-sheet-head">
          <h2 id="cl-sheet-title">{done ? pick(s.successTitle, locale) : pick(s.title, locale)}</h2>
          <button type="button" className="cl-x" onClick={() => planDraft.close()} aria-label={pick(s.close, locale)}>
            <span aria-hidden="true">×</span>
          </button>
        </header>

        {done ? (
          <div className="cl-sheet-body cl-success" role="status">
            <h3 ref={successRef} tabIndex={-1}>
              {done.what}
            </h3>
            <dl>
              <div>
                <dt>{pick(s.doctorLabel, locale)}</dt>
                <dd>{done.doctor}</dd>
              </div>
              <div>
                <dt>{pick(s.summarySlot, locale)}</dt>
                <dd>{done.when}</dd>
              </div>
            </dl>
            <p>{pick(s.successText, locale)}</p>
            {mode === "demo" && <p className="cl-note">{pick(s.demoNote, locale)}</p>}
            <a className="cl-btn" href={done.url} target="_blank" rel="noopener noreferrer">
              {pick(s.openTelegram, locale)}
            </a>
            <p className="cl-note">{pick(s.openTelegramHint, locale)}</p>
            <button type="button" className="cl-btn ghost" onClick={() => planDraft.send({})}>
              {pick(s.again, locale)}
            </button>
          </div>
        ) : (
          <form id="cl-book" className="cl-sheet-form" onSubmit={onSubmit} noValidate>
            <ol className="cl-steps" aria-label={pick(s.progress, locale)}>
              {steps.map((x) => (
                <li key={x.n} data-state={x.n === step ? "now" : x.n < step ? "done" : "next"} aria-current={x.n === step ? "step" : undefined}>
                  <i aria-hidden="true">{x.n}</i>
                  <span>{x.label}</span>
                </li>
              ))}
            </ol>

            <div className="cl-sheet-body" ref={bodyRef}>
              {step === 1 && (
                <section aria-label={pick(s.step1, locale)}>
                  {hasPlan ? (
                    <div className="cl-plan">
                      <p className="cl-plan-title">{pick(s.whatLabel, locale)}</p>
                      <ul>
                        {plan.items.map((it) => (
                          <li key={it.id}>
                            <b>{nameOf(it.id)}</b>
                            {it.qty > 1 && <span>×{it.qty}</span>}
                          </li>
                        ))}
                      </ul>
                      {teeth.length > 0 && <p className="cl-plan-teeth">{picksText(teeth, problemLabel)}</p>}
                      <button
                        type="button"
                        className="cl-link"
                        onClick={() => {
                          setItems([]);
                          setTeeth([]);
                        }}
                      >
                        {pick(s.clearPlan, locale)}
                      </button>
                    </div>
                  ) : (
                    <div className="cl-svc" role="group" aria-label={pick(s.whatLabel, locale)}>
                      {visible.map((x) => (
                        <button key={x.id} type="button" aria-pressed={x.id === serviceId} onClick={() => setPickedService(x.id)}>
                          {x.name}
                        </button>
                      ))}
                    </div>
                  )}
                </section>
              )}

              {step === 2 && (
                <section aria-label={pick(s.step2, locale)}>
                  <p className="cl-lab">{pick(s.doctorLabel, locale)}</p>
                  <div className="cl-pickdocs" role="group" aria-label={pick(s.doctorLabel, locale)}>
                    <button type="button" aria-pressed={doctorId === "any"} onClick={() => setPickedDoctor("any")}>
                      <span className="cl-any" aria-hidden="true">
                        ∗
                      </span>
                      <b>{pick(s.anyDoctor, locale)}</b>
                    </button>
                    {pool.map((d) => (
                      <button key={d.id} type="button" aria-pressed={doctorId === d.id} onClick={() => setPickedDoctor(d.id)}>
                        {/* eslint-disable-next-line @next/next/no-img-element -- переносимый шаблон: без next/image */}
                        <img src={`${IMG}/${d.photo}-480.webp`} width={44} height={44} alt="" loading="lazy" decoding="async" />
                        <b>{d.name.split(" ").pop()}</b>
                      </button>
                    ))}
                  </div>

                  <p className="cl-lab">{pick(s.dayLabel, locale)}</p>
                  <div className="cl-dates">
                    {dates.length === 0 && <span className="cl-skel" aria-hidden="true" />}
                    {dates.map((d) => {
                      const off = !hasFree(d);
                      const note = dayNote(d);
                      return (
                        <button key={d} type="button" aria-pressed={d === date} disabled={off} onClick={() => setPickedDate(d)} aria-label={`${formatDate(d, locale, { weekday: "long", day: "numeric", month: "long" })}${note ? `, ${note}` : ""}`}>
                          <small>{weekdayLabel(d)}</small>
                          <b>{dayOfMonth(d)}</b>
                        </button>
                      );
                    })}
                  </div>

                  <p className="cl-lab">{pick(s.timeLabel, locale)}</p>
                  <div className="cl-chips" role="group" aria-label={pick(s.timeLabel, locale)}>
                    <button type="button" aria-pressed={part === "all"} onClick={() => setPart("all")}>
                      {pick(s.partAll, locale)}
                    </button>
                    {DAY_PARTS.map((k) => (
                      <button key={k} type="button" aria-pressed={part === k} onClick={() => setPart(k)}>
                        {pick(PARTS[k], locale)}
                      </button>
                    ))}
                  </div>
                  {date && slots.length > 0 ? (
                    <div className="cl-slots">
                      {slots.map((x) => {
                        const free = x.status === "free";
                        return (
                          <button key={x.time} type="button" disabled={!free} aria-pressed={free && x.time === slot?.time} data-state={x.status} aria-label={free ? x.time : `${x.time}, ${pick(s.taken, locale)}`} onClick={() => setPickedTime(x.time)}>
                            {x.time}
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="cl-note">{pick(s.noSlots, locale)}</p>
                  )}
                  {errors.time && (
                    <p className="cl-err" role="alert">
                      {errors.time}
                    </p>
                  )}
                </section>
              )}

              {step === 3 && (
                <section aria-label={pick(s.step3, locale)}>
                  <div className="cl-field">
                    <label htmlFor="bk-name">{pick(s.name, locale)}</label>
                    <input id="bk-name" name="name" autoComplete="given-name" aria-invalid={!!errors.name} aria-describedby={errors.name ? "bk-name-e" : undefined} />
                    {errors.name && (
                      <p id="bk-name-e" className="cl-err">
                        {errors.name}
                      </p>
                    )}
                  </div>
                  <div className="cl-field">
                    <label htmlFor="bk-phone">{pick(s.phone, locale)}</label>
                    <input id="bk-phone" name="phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="+998 90 123 45 67" aria-invalid={!!errors.phone} aria-describedby={errors.phone ? "bk-phone-e" : undefined} />
                    {errors.phone && (
                      <p id="bk-phone-e" className="cl-err">
                        {errors.phone}
                      </p>
                    )}
                  </div>
                  <p className="cl-note">{pick(s.consent, locale)}</p>
                </section>
              )}
            </div>

            <footer className="cl-sheet-foot">
              <dl className="cl-sum" aria-label={pick(s.summaryLabel, locale)}>
                <div>
                  <dt>{pick(s.summaryPlan, locale)}</dt>
                  <dd>{what}</dd>
                </div>
                <div>
                  <dt>{pick(s.summaryPrice, locale)}</dt>
                  <dd>{price || "—"}</dd>
                </div>
                <div>
                  <dt>{pick(s.summarySlot, locale)}</dt>
                  <dd>{slotText}</dd>
                </div>
              </dl>
              <div className="cl-sheet-act">
                {step > 1 && (
                  <button type="button" className="cl-btn ghost" onClick={() => setStep((x) => (x === 3 ? 2 : 1))}>
                    {pick(s.back, locale)}
                  </button>
                )}
                {step < 3 ? (
                  <button type="button" className="cl-btn" onClick={goNext}>
                    {pick(s.next, locale)}
                  </button>
                ) : (
                  <button type="submit" className="cl-btn">
                    {pick(s.submit, locale)}
                  </button>
                )}
              </div>
            </footer>
          </form>
        )}
      </div>
    </dialog>
  );
}
