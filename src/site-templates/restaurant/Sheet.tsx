"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useMinuteClock } from "../kit/hooks";
import { plural } from "../kit/plural";
import { tashkentNow } from "../kit/tashkent";
import { formatSum, pick, type Locale } from "../types";
import { bookStore, useBook, type Wish } from "./book-store";
import type { MenuCategory, SetPreset } from "./data";
import { dateChipLabel, fill, guestsText, whenLabel } from "./format";
import { IconBriefcase, IconCake, IconCheck, IconClose, IconFamily, IconHall, IconSend, IconTapchan, IconTerrace } from "./icons";
import {
  DAY_PARTS,
  OCCASION_IDS,
  ZONES,
  ZONE_IDS,
  datesWithRoom,
  dayPartOf,
  slotIsFree,
  slotsForDay,
  zoneFits,
  zonesFor,
  type DayPart,
  type OccasionId,
  type ZoneId,
} from "./schedule";
import { dishIndex, liveLines, totalFor } from "./sets";
import { demo, useDemoState } from "./store";
import { useHours } from "./client-bits";
import { dishWords, restaurantUi as ui } from "./ui";

type Step = 1 | 2 | 3;
const STEP_KEYS = ["guests", "time", "contacts"] as const;
const MIN_PHONE_DIGITS = 9;
const DEFAULT_PART: DayPart = "evening";
const DEFAULT_PARTY = { label: "3–4", max: 4 };

/** Крупные кнопки компании: подпись и наибольшее число гостей для подбора зоны и стола. */
const PARTY_CHIPS = [
  { label: "1–2", max: 2 },
  { label: "3–4", max: 4 },
  { label: "5–8", max: 8 },
  { label: "9+", max: 12 },
];
const ZONE_ICON = { hall: IconHall, terrace: IconTerrace, tapchan: IconTapchan } satisfies Record<ZoneId, () => React.JSX.Element>;
const OCCASION_ICON = { birthday: IconCake, business: IconBriefcase, family: IconFamily } satisfies Record<OccasionId, () => React.JSX.Element>;

interface Party {
  label: string;
  max: number;
}

const bucketOf = (max: number) => PARTY_CHIPS.find((c) => max <= c.max) ?? PARTY_CHIPS[PARTY_CHIPS.length - 1];

interface Done {
  link: string;
  when: string;
  guests: string;
  zone: string;
  occasion: string | null;
  wish: string | null;
}

interface Props {
  name: string;
  telegram: string;
  hours: { open: string; close: string };
  mode: "demo" | "telegram";
  menu: MenuCategory[];
  sets: SetPreset[];
  locale: Locale;
}

/** Нативный <dialog>: Esc, фокус-ловушка и инертный фон — от браузера. На телефоне — на всю высоту. */
function Dialog({ open, onClose, label, children }: { open: boolean; onClose: () => void; label: string; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      className="rs-sheet"
      aria-label={label}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {open && <div className="rs-sheet-body">{children}</div>}
    </dialog>
  );
}

export function BookingSheet(props: Props) {
  const book = useBook();
  return (
    <Dialog open={book.open} onClose={() => bookStore.close()} label={pick(ui.sheet.title, props.locale)}>
      {book.open && <Flow key={book.nonce} {...props} />}
    </Dialog>
  );
}

/** Три шага: гости и повод → дата, зона и время → контакты. Липкая сводка сверху, «Далее» всегда под рукой. */
function Flow({ name, telegram, hours: baseHours, mode, menu, sets, locale }: Props) {
  const s = ui.sheet;
  const t = (l: Parameters<typeof pick>[0]) => pick(l, locale);
  const { seed } = useBook();
  const state = useDemoState();
  const hours = useHours(baseHours.open, baseHours.close);
  const clock = useMinuteClock();
  const now = clock > 0 ? tashkentNow(clock) : null;
  const headRef = useRef<HTMLHeadingElement>(null);

  const [step, setStep] = useState<Step>(1);
  const [party, setParty] = useState<Party>(() => (seed.guests ? { label: String(seed.guests), max: seed.guests } : DEFAULT_PARTY));
  const [occasion, setOccasion] = useState<OccasionId | null>(seed.occasion ?? null);
  const [zonePick, setZonePick] = useState<ZoneId>(seed.zone ?? "hall");
  const [datePick, setDatePick] = useState<string | null>(null);
  const [partPick, setPartPick] = useState<DayPart | null>(null);
  const [timePick, setTimePick] = useState<string | null>(null);
  const [wish, setWish] = useState<Wish | null>(seed.wish ?? null);
  const [guest, setGuest] = useState({ name: "", phone: "" });
  const [errors, setErrors] = useState<Partial<Record<"time" | "name" | "phone", string>>>({});
  const [done, setDone] = useState<Done | null>(null);

  useEffect(() => {
    headRef.current?.focus();
  }, [step, done]);

  const dishes = useMemo(() => dishIndex(menu, state.items), [menu, state.items]);
  const wishLines = wish ? liveLines(wish.lines, dishes) : [];
  const wishTotal = wish ? totalFor(wishLines, dishes, wish.discount).total : 0;
  const wishSet = wish?.kind === "set" ? sets.find((x) => x.id === wish.refId) : undefined;
  const wishText = (): string | null => {
    if (!wish || wishLines.length === 0) return null;
    const items = wishLines.map((l) => `${t(dishes.get(l.id)!.name)}${l.qty > 1 ? ` ×${l.qty}` : ""}`).join(", ");
    return wishSet ? `${t(wishSet.name)}: ${items}` : items;
  };

  // Зона всегда подходит компании: сменили гостей — зона пересчитывается.
  const zone: ZoneId = zoneFits(zonePick, party.max) ? zonePick : (zonesFor(party.max)[0] ?? "hall");
  const roomArgs = { open: hours.open, close: hours.close, zone, party: party.max, bookings: state.leads, now };
  const dates = datesWithRoom(roomArgs);
  const date = datePick && dates.includes(datePick) ? datePick : (dates[0] ?? null);
  const allSlots = date ? slotsForDay({ ...roomArgs, date }) : [];
  const partsWithRoom = DAY_PARTS.filter((p) => allSlots.some((x) => x.status === "free" && dayPartOf(x.time) === p));
  const part: DayPart = partPick && partsWithRoom.includes(partPick) ? partPick : partsWithRoom.includes(DEFAULT_PART) ? DEFAULT_PART : (partsWithRoom[0] ?? DEFAULT_PART);
  const slots = allSlots.filter((x) => dayPartOf(x.time) === part);
  const time = slots.some((x) => x.time === timePick && x.status === "free") ? timePick : null;
  const today = now?.iso ?? "";

  const guestsLabel = guestsText(party.label, party.max, locale);
  const whenText = date && time ? whenLabel(date, time, today, locale) : date ? whenLabel(date, "", today, locale) : "";
  const zoneText = t(ui.zones[zone]);
  const occasionText = occasion ? t(ui.occasions[occasion]) : null;

  function next() {
    if (step === 2 && !time) return setErrors({ time: t(s.errTime) });
    setErrors({});
    setStep((step + 1) as Step);
  }

  function submit() {
    const digits = guest.phone.replace(/\D/g, "").length;
    const e: typeof errors = {};
    if (guest.name.trim().length < 2) e.name = t(s.errName);
    if (digits < MIN_PHONE_DIGITS) e.phone = t(s.errPhone);
    setErrors(e);
    if (e.name || e.phone) return;
    if (!date || !time) return setStep(2);
    // Окно могло стоять открытым в другой вкладке: слот проверяем ещё раз по свежему состоянию.
    if (!slotIsFree(demo.get().leads, date, time, zone)) {
      setTimePick(null);
      setErrors({ time: t(s.errTaken) });
      return setStep(2);
    }
    const when = `${date}T${time}`;
    const wishLine = wishText();
    demo.addLead({
      name: guest.name.trim(),
      phone: guest.phone.trim(),
      when,
      guests: party.label,
      zone,
      occasion: occasion ?? undefined,
      wish: wishLine ?? undefined,
      wishSum: wishLine ? wishTotal : undefined,
    });
    const when2 = whenLabel(date, time, today, locale);
    const wishFull = wishLine ? `${wishLine} · ${formatSum(wishTotal, locale)}` : null;
    const text = [
      `${t(s.tg.head)} · ${name}`,
      `${guest.name.trim()}, ${guest.phone.trim()}`,
      `${t(s.tg.when)}: ${when2}`,
      `${t(s.tg.guests)}: ${guestsLabel} · ${zoneText}${occasionText ? ` · ${occasionText}` : ""}`,
      ...(wishFull ? [`${t(s.tg.wish)}: ${wishFull}`] : []),
    ].join("\n");
    const link = `https://t.me/${telegram}?text=${encodeURIComponent(text)}`;
    // Открыть окно в режиме demo незачем; в telegram — открываем, а ссылка остаётся на экране на случай блокировки.
    if (mode === "telegram") window.open(link, "_blank", "noopener");
    setDone({ link, when: when2, guests: guestsLabel, zone: zoneText, occasion: occasionText, wish: wishFull });
  }

  const close = () => bookStore.close();

  if (done) {
    return (
      <div className="rs-done" role="status">
        <span className="rs-done-mark" aria-hidden="true">
          <IconCheck />
        </span>
        <h2 ref={headRef} tabIndex={-1}>
          {t(s.successTitle)}
        </h2>
        <p className="rs-done-when" data-done-when>
          {done.when}
        </p>
        <p className="rs-done-chips">
          <span>{done.guests}</span>
          <span>{done.zone}</span>
          {done.occasion && <span>{done.occasion}</span>}
        </p>
        {done.wish && <p className="rs-done-wish">{done.wish}</p>}
        <p className="rs-note">{t(s.successText)}</p>
        <a className="rs-cta" data-tg-link href={done.link} target="_blank" rel="noopener noreferrer">
          <IconSend />
          {t(s.openTelegram)}
        </a>
        <p className="rs-note">{mode === "demo" ? t(s.demoNote) : t(s.openTelegramHint)}</p>
        <button type="button" className="rs-ghost" onClick={close}>
          {t(s.done)}
        </button>
      </div>
    );
  }

  return (
    <>
      <header className="rs-sheet-head">
        <h2 ref={headRef} tabIndex={-1}>
          {t(s.title)}
        </h2>
        <button type="button" className="rs-x" onClick={close} aria-label={t(s.close)}>
          <IconClose />
        </button>
      </header>

      <ol className="rs-progress" aria-label={t(s.stepsLabel)}>
        {STEP_KEYS.map((k, i) => (
          <li key={k} data-state={i + 1 < step ? "done" : i + 1 === step ? "now" : "next"} aria-current={i + 1 === step ? "step" : undefined}>
            <span>{t(s.steps[k])}</span>
          </li>
        ))}
      </ol>

      <div className="rs-summary" aria-live="polite" data-summary>
        <span>{guestsLabel}</span>
        {whenText && <span>{whenText}</span>}
        <span>{zoneText}</span>
        {occasionText && <span>{occasionText}</span>}
      </div>
      {wish && wishLines.length > 0 && (
        <p className="rs-wish" data-wish>
          <span>
            <small>{t(s.wish)}</small>
            <b>{wishSet ? t(wishSet.name) : t(dishes.get(wishLines[0].id)!.name)}</b>
            {wish.kind === "set" && <em>{`${wishLines.length} ${plural(locale, wishLines.length, dishWords[locale])} · ${formatSum(wishTotal, locale)}`}</em>}
          </span>
          <button type="button" onClick={() => setWish(null)} aria-label={t(s.wishRemove)}>
            <IconClose />
          </button>
        </p>
      )}

      <div className="rs-sheet-main">
        {step === 1 && (
          <>
            <h3 className="rs-q">{t(s.guestsTitle)}</h3>
            <div className="rs-chips party" role="radiogroup" aria-label={t(s.guestsTitle)}>
              {PARTY_CHIPS.map((c) => (
                <button key={c.label} type="button" role="radio" aria-checked={bucketOf(party.max).label === c.label} data-party={c.label} onClick={() => setParty({ label: c.label, max: c.max })}>
                  {c.label}
                </button>
              ))}
            </div>
            <h3 className="rs-q">
              {t(s.occasionTitle)} <small>{t(s.optional)}</small>
            </h3>
            <div className="rs-chips occasion" role="radiogroup" aria-label={t(s.occasionTitle)}>
              {OCCASION_IDS.map((o) => {
                const Icon = OCCASION_ICON[o];
                return (
                  <button key={o} type="button" role="radio" aria-checked={occasion === o} data-occasion={o} onClick={() => setOccasion(occasion === o ? null : o)}>
                    <Icon />
                    {t(ui.occasions[o])}
                  </button>
                );
              })}
            </div>
          </>
        )}

        {step === 2 && (
          <>
            {errors.time && (
              <p className="rs-error" role="alert">
                {errors.time}
              </p>
            )}
            <h3 className="rs-q">{t(s.dateTitle)}</h3>
            {dates.length === 0 && now ? (
              <p className="rs-empty">{t(s.noDays)}</p>
            ) : (
              <div className="rs-dates" role="radiogroup" aria-label={t(s.dateTitle)}>
                {dates.map((d) => {
                  const l = dateChipLabel(d, today, locale);
                  return (
                    <button key={d} type="button" role="radio" aria-checked={d === date} data-date={d} onClick={() => setDatePick(d)}>
                      <small>{l.top}</small>
                      <b>{l.bottom}</b>
                    </button>
                  );
                })}
              </div>
            )}

            <h3 className="rs-q">{t(s.zoneTitle)}</h3>
            <div className="rs-chips zone" role="radiogroup" aria-label={t(s.zoneTitle)}>
              {ZONE_IDS.map((z) => {
                const Icon = ZONE_ICON[z];
                const fits = zoneFits(z, party.max);
                const cap = ZONES[z];
                const hint = cap.min > 1 ? fill(t(ui.zones.range), { a: cap.min, b: cap.max }) : fill(t(ui.zones.upTo), { n: cap.max });
                return (
                  <button key={z} type="button" role="radio" aria-checked={z === zone} data-zone={z} disabled={!fits} title={fits ? undefined : t(ui.zones.noFit)} onClick={() => setZonePick(z)}>
                    <Icon />
                    <span>
                      {t(ui.zones[z])}
                      <small>{hint}</small>
                    </span>
                  </button>
                );
              })}
            </div>

            <h3 className="rs-q">{t(s.timeTitle)}</h3>
            <div className="rs-parts" role="group" aria-label={t(s.partsLabel)}>
              {DAY_PARTS.map((p) => (
                <button key={p} type="button" aria-pressed={p === part} data-part={p} disabled={!partsWithRoom.includes(p)} onClick={() => setPartPick(p)}>
                  {t(s.parts[p])}
                </button>
              ))}
            </div>
            {slots.length === 0 ? (
              <p className="rs-empty">{t(s.noRoom)}</p>
            ) : (
              <div className="rs-slots" role="radiogroup" aria-label={t(s.timeTitle)}>
                {slots.map((x) => (
                  <button key={x.time} type="button" role="radio" aria-checked={x.time === time} data-time={x.time} data-status={x.status} disabled={x.status === "taken"} title={x.status === "taken" ? t(s.taken) : undefined} onClick={() => setTimePick(x.time)}>
                    {x.time}
                  </button>
                ))}
              </div>
            )}
          </>
        )}

        {step === 3 && (
          <form
            className="rs-form"
            noValidate
            onSubmit={(e) => {
              e.preventDefault();
              submit();
            }}
          >
            <label>
              <span>{t(s.name)}</span>
              <input name="name" autoComplete="given-name" enterKeyHint="next" value={guest.name} onChange={(e) => setGuest({ ...guest, name: e.target.value })} aria-invalid={!!errors.name} />
              {errors.name && <em role="alert">{errors.name}</em>}
            </label>
            <label>
              <span>{t(s.phone)}</span>
              <input name="phone" type="tel" inputMode="tel" autoComplete="tel" enterKeyHint="send" placeholder="+998 90 123 45 67" value={guest.phone} onChange={(e) => setGuest({ ...guest, phone: e.target.value })} aria-invalid={!!errors.phone} />
              {errors.phone && <em role="alert">{errors.phone}</em>}
            </label>
            <p className="rs-note">{t(s.consent)}</p>
          </form>
        )}
      </div>

      <footer className="rs-sheet-foot">
        {step > 1 && (
          <button type="button" className="rs-ghost" data-back onClick={() => setStep((step - 1) as Step)}>
            {t(s.back)}
          </button>
        )}
        {step < 3 ? (
          <button type="button" className="rs-cta" data-next onClick={next} disabled={step === 2 && !time}>
            {t(s.next)}
          </button>
        ) : (
          <button type="button" className="rs-cta" data-submit onClick={submit}>
            <IconSend />
            {t(s.submit)}
          </button>
        )}
      </footer>
    </>
  );
}
