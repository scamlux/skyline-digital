"use client";

import { useMinuteClock } from "../kit/hooks";
import { addDays, formatDate, tashkentNow, type TashkentNow } from "../kit/tashkent";
import { pick, type Locale } from "../types";
import { nextFreeSlotFor, type ClinicOverrides, type FreeSlot, type ScheduleData } from "./schedule";
import { useClinicState, type ClinicState } from "./store";
import { clinicUi as ui } from "./ui";

/**
 * Живое состояние для клиентских островов: правки владельца (цены, график, записи) и «сейчас» по
 * Ташкенту. До гидрации now = null — разметка совпадает с серверной, а живые значения
 * (ближайшее окно) показывают заглушку той же ширины, чтобы страница не прыгала.
 */
export interface Live {
  state: ClinicState;
  ov: ClinicOverrides;
  now: TashkentNow | null;
}

export function useLive(): Live {
  const state = useClinicState();
  const clock = useMinuteClock();
  return { state, ov: { services: state.services, schedule: state.schedule }, now: clock > 0 ? tashkentNow(clock) : null };
}

/** «сегодня, 10:30», «завтра, 09:00», «пн, 3 ноя, 11:00». */
export function slotWhen(slot: FreeSlot, now: TashkentNow, locale: Locale): string {
  const day =
    slot.date === now.iso
      ? pick(ui.today, locale)
      : slot.date === addDays(now.iso, 1)
        ? pick(ui.tomorrow, locale)
        : formatDate(slot.date, locale, { weekday: "short", day: "numeric", month: "short" });
  return `${day}, ${slot.time}`;
}

/** Ближайшее свободное окно по услуге/врачу — текст в рамке постоянной ширины. */
export function NextSlot({ sched, serviceId, doctorId, locale }: { sched: ScheduleData; serviceId?: string; doctorId?: string; locale: Locale }) {
  const { state, ov, now } = useLive();
  let text = "—";
  if (now) {
    const slot = nextFreeSlotFor(sched, ov, state.bookings, now, { serviceId, doctorId });
    text = slot ? slotWhen(slot, now, locale) : pick(ui.noSlot, locale);
  }
  return (
    <span className="tpl-next" aria-live="polite">
      {text}
    </span>
  );
}
