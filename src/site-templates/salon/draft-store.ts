"use client";

import { useSyncExternalStore } from "react";
import { canCombine, mastersFor, type ScheduleData } from "./schedule";

/**
 * Выбор гостя до отправки записи: услуги, мастер, образ-источник и состояние шторки записи.
 * Живёт только в памяти страницы: острова одной страницы разделяют общую переменную,
 * localStorage тут не нужен. Любая карточка («Записаться» у образа, мастера, пакета, результата
 * подбора) кладёт сюда свой выбор и открывает шторку на нужном шаге.
 */
export type Step = 1 | 2 | 3;

export interface BookingDraft {
  open: boolean;
  step: Step;
  serviceIds: string[];
  masterId: string | null;
  /** Образ из лукбука, если запись началась с него (попадёт в заявку и Telegram). */
  lookId: string | null;
  /** Последняя замена выбора из-за мастера — подсказка в шторке. */
  switched: boolean;
  /** Растёт при каждом открытии: шторка понимает, что пора сбросить время и день. */
  nonce: number;
}

const EMPTY: BookingDraft = { open: false, step: 1, serviceIds: [], masterId: null, lookId: null, switched: false, nonce: 0 };
let current: BookingDraft = EMPTY;
const listeners = new Set<() => void>();

const set = (next: Partial<BookingDraft>) => {
  current = { ...current, ...next };
  listeners.forEach((l) => l());
};

export interface OpenPreset {
  serviceIds?: string[];
  masterId?: string | null;
  lookId?: string | null;
  /** Шаг, с которого начать; по умолчанию — второй, если услуги уже выбраны. */
  step?: Step;
}

export const bookingDraft = {
  get: () => current,

  /**
   * Открыть шторку. Общая кнопка «Записаться» (шапка, hero, панель) начинает с чистого листа и первого
   * шага, чтобы старый предвыбор из образа не всплывал сам. Карточка с предвыбором (образ, мастер, пакет,
   * результат подбора) передаёт свои услуги и шаг.
   */
  open(preset: OpenPreset = {}) {
    const serviceIds = preset.serviceIds ?? [];
    set({
      open: true,
      serviceIds,
      masterId: preset.masterId ?? null,
      lookId: preset.lookId ?? null,
      step: preset.step ?? (serviceIds.length > 0 ? 2 : 1),
      switched: false,
      nonce: current.nonce + 1,
    });
  },

  close() {
    set({ open: false });
  },

  setStep(step: Step) {
    set({ step });
  },

  setMaster(masterId: string | null) {
    set({ masterId });
  },

  /**
   * Добавить/убрать услугу. Если новой услуги нет у мастеров текущего набора, набор заменяется
   * этой услугой (выбор не упирается в «нет мастера»), а шторка подсказывает, что произошло.
   */
  toggleService(sched: ScheduleData, id: string) {
    const has = current.serviceIds.includes(id);
    if (has) {
      set({ serviceIds: current.serviceIds.filter((x) => x !== id), switched: false });
      return;
    }
    const ok = canCombine(sched, current.serviceIds, id);
    const serviceIds = ok ? [...current.serviceIds, id] : [id];
    const masterOk = current.masterId === null || mastersFor(sched, serviceIds).some((m) => m.id === current.masterId);
    set({ serviceIds, masterId: masterOk ? current.masterId : null, switched: !ok });
  },

  /** Заменить набор целиком (пакет, образ, результат подбора). */
  setServices(serviceIds: string[], extra: { masterId?: string | null; lookId?: string | null } = {}) {
    set({ serviceIds, masterId: extra.masterId ?? null, lookId: extra.lookId ?? null, switched: false });
  },

  /** Сбросить выбор после успешной записи. */
  reset() {
    set({ ...EMPTY, nonce: current.nonce });
  },
};

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

export const useBookingDraft = (): BookingDraft => useSyncExternalStore(subscribe, bookingDraft.get, () => EMPTY);
