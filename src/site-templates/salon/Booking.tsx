"use client";

import { useEffect, useRef, useState } from "react";
import { useMinuteClock } from "../kit/hooks";
import { addDays, dayOfMonth, formatDate, tashkentNow } from "../kit/tashkent";
import { formatSum, pick } from "../types";
import { StepServices } from "./BookingServices";
import { useOverrides, useNextWindowFor } from "./client-bits";
import { useSalon, useSalonStore } from "./context";
import { bookingDraft, useBookingDraft, type Step } from "./draft-store";
import { fill, formatMinutes, whenLabel } from "./format";
import { Icon } from "./icons";
import { basketOf, DAY_PARTS, masterDays, mastersFor, partOfDay, slotsForDay, type DayPart, type Slot } from "./schedule";
import { salonUi as ui } from "./ui";

/** Сколько ближайших дней показываем в выборе даты. */
const DAYS_AHEAD = 7;
const MIN_PHONE_DIGITS = 9;
const MIN_NAME_LENGTH = 2;
const STEPS: Step[] = [1, 2, 3];

type Errors = Partial<Record<"time" | "name" | "phone", string>>;

interface Done {
  url: string;
  services: string;
  master: string;
  when: string;
  total: string;
}

/**
 * Запись онлайн в три шага со шторкой: 1) услуги, 2) мастер и время, 3) контакты. На телефоне
 * шторка выезжает снизу на всю высоту, на компьютере это окно по центру. Внизу всегда липкая
 * сводка (услуги, время, цена, выгода по пакету) и одна кнопка «Далее» / «Записаться».
 * Сетка свободного времени считается той же функцией, что и «ближайшее окно» в карточках мастеров.
 */
export function BookingSheet() {
  const { locale, name: salon, telegram, mode, sched, services, masters, perks, style } = useSalon();
  const { state, demo } = useSalonStore();
  const ov = useOverrides();
  const draft = useBookingDraft();
  const clock = useMinuteClock();
  const now = clock > 0 ? tashkentNow(clock) : null;
  const dialogRef = useRef<HTMLDialogElement>(null);
  const headRef = useRef<HTMLHeadingElement>(null);
  const successRef = useRef<HTMLHeadingElement>(null);

  const [pickedDate, setPickedDate] = useState<string | null>(null);
  const [pickedTime, setPickedTime] = useState<string | null>(null);
  const [part, setPart] = useState<DayPart | "all">("all");
  const [perk, setPerk] = useState<string | null>(null);
  const [errors, setErrors] = useState<Errors>({});
  const [done, setDone] = useState<Done | null>(null);
  const [seenNonce, setSeenNonce] = useState(0);

  // Каждое открытие шторки начинает с чистого дня и времени (обновление при рендере — штатный приём React).
  if (draft.nonce !== seenNonce) {
    setSeenNonce(draft.nonce);
    setPickedDate(null);
    setPickedTime(null);
    setPart("all");
    setErrors({});
    setDone(null);
  }

  // Нативный <dialog>: showModal даёт фокус-ловушку, Esc и инертный фон.
  useEffect(() => {
    const d = dialogRef.current;
    if (!d) return;
    if (draft.open && !d.open) d.showModal();
    if (!draft.open && d.open) d.close();
    document.documentElement.toggleAttribute("data-sheet", draft.open);
    return () => document.documentElement.removeAttribute("data-sheet");
  }, [draft.open]);

  // Фокус на заголовок шага, когда шаг меняется.
  useEffect(() => {
    if (draft.open) (done ? successRef.current : headRef.current)?.focus();
  }, [draft.step, draft.open, done]);

  const visible = services.filter((s) => !ov.services[s.id]?.hidden && mastersFor(sched, [s.id]).length > 0);
  const ids = draft.serviceIds.filter((id) => visible.some((s) => s.id === id));
  const basket = basketOf(sched, ov, ids);
  const able = mastersFor(sched, basket.ids);
  const masterId = draft.masterId && able.some((m) => m.id === draft.masterId) ? draft.masterId : "any";

  const dates = now ? Array.from({ length: DAYS_AHEAD }, (_, i) => addDays(now.iso, i)) : [];
  const grids: Record<string, Slot[]> = {};
  if (now && basket.ids.length > 0 && draft.step >= 2) {
    for (const d of dates) grids[d] = slotsForDay({ data: sched, ov, bookings: state.bookings, date: d, serviceIds: basket.ids, masterId, now });
  }
  const firstOpenDate = dates.find((d) => grids[d]?.some((s) => s.status === "free"));
  const date = pickedDate && dates.includes(pickedDate) ? pickedDate : (firstOpenDate ?? dates[0] ?? null);
  const slots = date ? (grids[date] ?? []) : [];
  const slot = slots.find((s) => s.time === pickedTime && s.status === "free") ?? null;
  const shownSlots = part === "all" ? slots : slots.filter((s) => partOfDay(s.time) === part);
  const masterName = (id: string | null) => masters.find((m) => m.id === id)?.name ?? "";
  const nameOf = (id: string) => services.find((s) => s.id === id)?.name ?? id;

  const close = () => bookingDraft.close();

  function next() {
    if (draft.step === 1 && basket.ids.length > 0) bookingDraft.setStep(2);
    else if (draft.step === 2) {
      if (!slot) {
        setErrors({ time: pick(ui.sheet.pickTime, locale) });
        return;
      }
      setErrors({});
      bookingDraft.setStep(3);
    }
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const name = String(fd.get("name") ?? "").trim();
    const phone = String(fd.get("phone") ?? "").trim();
    const found: Errors = {};
    if (!date || !slot?.masterId) found.time = pick(ui.sheet.pickTime, locale);
    if (name.length < MIN_NAME_LENGTH) found.name = pick(ui.sheet.errName, locale);
    if (phone.replace(/\D/g, "").length < MIN_PHONE_DIGITS) found.phone = pick(ui.sheet.errPhone, locale);
    setErrors(found);
    if (Object.keys(found).length > 0 || !date || !slot?.masterId || !now) {
      e.currentTarget.querySelector<HTMLElement>("[data-invalid=true]")?.focus();
      return;
    }
    const saved = demo.addBooking({ name, phone, serviceIds: basket.ids, masterId: slot.masterId, anyMaster: masterId === "any", date, time: slot.time, minutes: basket.minutes, total: basket.price, lookId: draft.lookId ?? undefined, perk: perk ?? undefined, packageId: basket.packageId ?? undefined });
    if (!saved) {
      setErrors({ time: pick(ui.sheet.errBusy, locale) });
      setPickedTime(null);
      bookingDraft.setStep(2);
      return;
    }
    const servicesText = basket.ids.map(nameOf).join(" + ");
    const perkText = perk ? perks.find((p) => p.id === perk)?.name : "";
    const text =
      fill(pick(ui.sheet.tgText, locale), { salon, services: servicesText, master: masterName(slot.masterId), when: `${formatDate(date, locale, { day: "numeric", month: "long" })}, ${slot.time}`, total: formatSum(basket.price, locale), name, phone }) + (perkText ? ` ${perkText}.` : "");
    const url = `https://t.me/${telegram}?text=${encodeURIComponent(text)}`;
    // В режиме telegram чат открываем сами; в демо только кнопка в подтверждении (новая вкладка увела бы из демо).
    if (mode === "telegram") window.open(url, "_blank", "noopener");
    setDone({ url, services: servicesText, master: masterName(slot.masterId), when: whenLabel(date, slot.time, now.iso, locale), total: `${formatSum(basket.price, locale)} · ${formatMinutes(basket.minutes, locale)}` });
  }

  const titles: Record<Step, string> = { 1: pick(ui.sheet.step1, locale), 2: pick(ui.sheet.step2, locale), 3: pick(ui.sheet.step3, locale) };
  const summaryNames = basket.ids.map(nameOf).join(" + ");

  return (
    <dialog ref={dialogRef} className="sl-sheet" aria-label={pick(ui.sheet.label, locale)} onClose={() => draft.open && bookingDraft.close()} onClick={(e) => e.target === dialogRef.current && close()}>
      <div className="sl-sheet-box" data-style={style}>
        <header className="sl-sheet-head">
          <ol className="sl-steps" aria-label={pick(ui.sheet.steps, locale)}>
            {STEPS.map((n) => (
              <li key={n} data-state={done || n < draft.step ? "done" : n === draft.step ? "now" : "todo"} aria-current={!done && n === draft.step ? "step" : undefined}>
                <i>{done || n < draft.step ? <Icon id="check" size={14} /> : n}</i>
                <span>{titles[n]}</span>
              </li>
            ))}
          </ol>
          <button type="button" className="sl-sheet-x" onClick={close} aria-label={pick(ui.sheet.close, locale)}>
            <Icon id="close" size={22} />
          </button>
        </header>

        {done ? (
          <div className="sl-sheet-body sl-success" role="status">
            <span className="sl-success-ic">
              <Icon id="check" size={34} />
            </span>
            <h2 ref={successRef} tabIndex={-1}>
              {pick(ui.sheet.successTitle, locale)}
            </h2>
            <dl className="sl-success-card">
              <div>
                <dt>
                  <Icon id="scissors" size={18} />
                </dt>
                <dd>{done.services}</dd>
              </div>
              <div>
                <dt>
                  <Icon id="user" size={18} />
                </dt>
                <dd>{done.master}</dd>
              </div>
              <div>
                <dt>
                  <Icon id="calendar" size={18} />
                </dt>
                <dd>{done.when}</dd>
              </div>
              <div>
                <dt>{pick(ui.sheet.total, locale)}</dt>
                <dd>{done.total}</dd>
              </div>
            </dl>
            <p>{pick(ui.sheet.successText, locale)}</p>
            {mode === "demo" && <p className="sl-note">{pick(ui.sheet.demoNote, locale)}</p>}
            <div className="sl-success-act">
              <a className="sl-btn" href={done.url} target="_blank" rel="noopener noreferrer">
                {pick(ui.sheet.openTelegram, locale)}
              </a>
              <button
                type="button"
                className="sl-btn sl-btn-line"
                onClick={() => {
                  bookingDraft.reset();
                  bookingDraft.open({ serviceIds: [], step: 1 });
                }}
              >
                {pick(ui.sheet.again, locale)}
              </button>
            </div>
          </div>
        ) : (
          <form className="sl-sheet-form" onSubmit={onSubmit} noValidate>
            <div className="sl-sheet-body">
              <h2 ref={headRef} tabIndex={-1} className="sl-sheet-title">
                {draft.step === 1 ? pick(ui.sheet.pickService, locale) : draft.step === 2 ? pick(ui.sheet.pickTime, locale) : titles[3]}
              </h2>

              {draft.step === 1 && <StepServices />}

              {draft.step === 2 && (
                <div className="sl-step-body">
                  <MasterPick able={able.map((m) => m.id)} masterId={masterId} serviceIds={basket.ids} />
                  <div className="sl-days" role="group" aria-label={pick(ui.sheet.day, locale)}>
                    {dates.map((d) => {
                      const day = grids[d] ?? [];
                      const off = day.length === 0 ? pick(ui.sheet.dayOff, locale) : !day.some((s) => s.status === "free") ? pick(ui.sheet.noFree, locale) : now && d === now.iso ? pick(ui.sheet.todayShort, locale) : "";
                      const disabled = basket.ids.length > 0 && !day.some((s) => s.status === "free");
                      return (
                        <button key={d} type="button" aria-pressed={d === date} disabled={disabled} onClick={() => (setPickedDate(d), setPickedTime(null))} aria-label={`${formatDate(d, locale, { weekday: "long", day: "numeric", month: "long" })}${off ? `, ${off}` : ""}`}>
                          <small>{formatDate(d, locale, { weekday: "short" })}</small>
                          <b>{dayOfMonth(d)}</b>
                          <em>{off || " "}</em>
                        </button>
                      );
                    })}
                  </div>
                  <div className="sl-chips sl-chips-scroll" role="group" aria-label={pick(ui.sheet.partsLabel, locale)}>
                    {(["all", ...DAY_PARTS] as const).map((p) => (
                      <button key={p} type="button" className="sl-chip" aria-pressed={part === p} onClick={() => setPart(p)}>
                        {pick(ui.sheet.parts[p], locale)}
                      </button>
                    ))}
                  </div>
                  {date && shownSlots.length > 0 ? (
                    <div className="sl-slots" role="group" aria-label={pick(ui.sheet.time, locale)}>
                      {shownSlots.map((s) => {
                        const free = s.status === "free";
                        return (
                          <button key={s.time} type="button" disabled={!free} aria-pressed={free && s.time === slot?.time} data-state={s.status} aria-label={free ? s.time : `${s.time}, ${pick(ui.sheet.taken, locale)}`} onClick={() => (setPickedTime(s.time), setErrors({}))}>
                            {s.time}
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="sl-note">{pick(dates.length === 0 ? ui.sheet.loading : ui.sheet.noSlots, locale)}</p>
                  )}
                  {errors.time && (
                    <p className="sl-err" role="alert">
                      {errors.time}
                    </p>
                  )}
                </div>
              )}

              {draft.step === 3 && (
                <div className="sl-step-body">
                  <div className="sl-recap">
                    <span>
                      <Icon id="calendar" size={18} />
                      {date && slot ? whenLabel(date, slot.time, now?.iso ?? "", locale) : ""}
                    </span>
                    <span>
                      <Icon id="user" size={18} />
                      {masterName(slot?.masterId ?? null)}
                    </span>
                  </div>
                  <div className="sl-field">
                    <label htmlFor="sl-name">{pick(ui.sheet.name, locale)}</label>
                    <input id="sl-name" name="name" type="text" autoComplete="name" aria-invalid={!!errors.name} data-invalid={errors.name ? "true" : undefined} aria-describedby={errors.name ? "sl-name-err" : undefined} />
                    {errors.name && (
                      <p className="sl-err" id="sl-name-err" role="alert">
                        {errors.name}
                      </p>
                    )}
                  </div>
                  <div className="sl-field">
                    <label htmlFor="sl-phone">{pick(ui.sheet.phone, locale)}</label>
                    <input id="sl-phone" name="phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="+998" aria-invalid={!!errors.phone} data-invalid={errors.phone ? "true" : undefined} aria-describedby={errors.phone ? "sl-phone-err" : undefined} />
                    {errors.phone && (
                      <p className="sl-err" id="sl-phone-err" role="alert">
                        {errors.phone}
                      </p>
                    )}
                  </div>
                  {perks.length > 0 && (
                    <div className="sl-field">
                      <span className="sl-label" id="sl-perk-l">
                        {pick(ui.sheet.perk, locale)}
                      </span>
                      <div className="sl-chips" role="group" aria-labelledby="sl-perk-l">
                        {perks.map((p) => (
                          <button key={p.id} type="button" className="sl-chip" aria-pressed={perk === p.id} onClick={() => setPerk(perk === p.id ? null : p.id)}>
                            <Icon id={p.icon} size={20} />
                            {p.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <footer className="sl-sheet-foot">
              <div className="sl-sum" role="status" aria-label={pick(ui.sheet.total, locale)}>
                <span className="sl-sum-names">{basket.ids.length > 0 ? summaryNames : pick(ui.sheet.pickService, locale)}</span>
                <span className="sl-sum-line">
                  {basket.saved > 0 && <s>{formatSum(basket.full, locale)}</s>}
                  <b>{basket.ids.length > 0 ? formatSum(basket.price, locale) : "—"}</b>
                  {basket.ids.length > 0 && <span>{formatMinutes(basket.minutes, locale)}</span>}
                  {basket.saved > 0 && <em>{fill(pick(ui.sheet.saved, locale), { sum: formatSum(basket.saved, locale) })}</em>}
                </span>
              </div>
              <div className="sl-sheet-act">
                {draft.step > 1 && (
                  <button type="button" className="sl-btn sl-btn-line sl-back" onClick={() => bookingDraft.setStep((draft.step - 1) as Step)} aria-label={pick(ui.sheet.back, locale)}>
                    <Icon id="arrow" size={20} className="sl-flip" />
                  </button>
                )}
                {draft.step < 3 ? (
                  <button type="button" className="sl-btn sl-next" disabled={basket.ids.length === 0} onClick={next}>
                    {pick(ui.sheet.next, locale)}
                    <Icon id="arrow" size={20} />
                  </button>
                ) : (
                  <button type="submit" className="sl-btn sl-next">
                    {pick(ui.sheet.submit, locale)}
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

/** Выбор мастера: аватары с «ближайшим окном». «Любой» подбирает первое свободное окно. */
function MasterPick({ able, masterId, serviceIds }: { able: string[]; masterId: string; serviceIds: string[] }) {
  const { locale, masters } = useSalon();
  const ov = useOverrides();
  return (
    <ul className="sl-mpick sl-snap" role="radiogroup" aria-label={pick(ui.sheet.master, locale)}>
      <MasterOption id="any" name={pick(ui.sheet.anyMaster, locale)} hint={pick(ui.sheet.anyMasterHint, locale)} photo={null} checked={masterId === "any"} serviceIds={serviceIds} />
      {able.map((id) => {
        const m = masters.find((x) => x.id === id);
        if (!m) return null;
        const off = masterDays({ id, serviceIds: m.serviceIds, days: [] }, ov).length === 0;
        return <MasterOption key={id} id={id} name={m.name.split(" ")[0]} photo={m.photo} checked={masterId === id} disabled={off} serviceIds={serviceIds} />;
      })}
    </ul>
  );
}

function MasterOption({ id, name, hint, photo, checked, disabled, serviceIds }: { id: string; name: string; hint?: string; photo: string | null; checked: boolean; disabled?: boolean; serviceIds: string[] }) {
  const { locale } = useSalon();
  const win = useNextWindowFor(id === "any" ? undefined : id, serviceIds);
  const label = hint ?? (disabled ? pick(ui.masters.dayOff, locale) : win === undefined ? "—" : win ? win.label : pick(ui.masters.noSlot, locale));
  return (
    <li>
      <button type="button" role="radio" aria-checked={checked} disabled={disabled} className="sl-mopt" onClick={() => (bookingDraft.setMaster(id === "any" ? null : id))}>
        <span className="sl-mopt-av">
          {photo ? (
            // eslint-disable-next-line @next/next/no-img-element -- шаблон переносимый: без next/image
            <img src={`/templates/salon/img/${photo}-480.webp`} width={96} height={96} alt="" loading="lazy" decoding="async" />
          ) : (
            <Icon id="user" size={26} />
          )}
        </span>
        <b>{name}</b>
        <small>{label}</small>
      </button>
    </li>
  );
}
