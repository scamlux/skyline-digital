"use client";

import { useSyncExternalStore } from "react";
import type { PlanItem } from "./schedule";
import type { ToothPick } from "./teeth";

/**
 * Черновик записи: то, что посетитель выбрал на сайте (плитка «Что беспокоит?», карта зубов,
 * пакет, врач) и что уходит в окно записи. Живёт только в памяти страницы: плитки, челюсть,
 * врачи и окно записи — разные острова одной страницы, им нужна общая переменная.
 */
export interface PlanDraft {
  items: PlanItem[];
  /** Зубы с проблемами из карты (то же, что items, но с номерами зубов). */
  teeth: ToothPick[];
  /** Предвыбранная услуга (плитка, карточка, первая позиция плана). */
  serviceId: string | null;
  /** Предвыбранный врач. */
  doctorId: string | null;
  /** Окно записи открыто. */
  open: boolean;
  /** Растёт при каждой отправке: окно понимает, что пора подхватить новый выбор. */
  nonce: number;
}

const EMPTY: PlanDraft = { items: [], teeth: [], serviceId: null, doctorId: null, open: false, nonce: 0 };
let current: PlanDraft = EMPTY;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export interface PlanPreset {
  items?: PlanItem[];
  teeth?: ToothPick[];
  serviceId?: string | null;
  doctorId?: string | null;
}

export const planDraft = {
  get: () => current,
  /** Подставить выбор и открыть окно записи. */
  send(preset: PlanPreset) {
    current = {
      items: preset.items ?? [],
      teeth: preset.teeth ?? [],
      serviceId: preset.serviceId ?? preset.items?.[0]?.id ?? null,
      doctorId: preset.doctorId ?? null,
      open: true,
      nonce: current.nonce + 1,
    };
    emit();
  },
  /** Открыть окно с тем, что уже выбрано (кнопка «Записаться» в шапке). */
  open() {
    current = { ...current, open: true };
    emit();
  },
  close() {
    current = { ...current, open: false };
    emit();
  },
  /** После успешной записи: выбор очищается, окно остаётся открытым (показывает «Вы записаны»). */
  clear() {
    current = { ...EMPTY, open: current.open, nonce: current.nonce };
    emit();
  },
};

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

export const usePlanDraft = (): PlanDraft => useSyncExternalStore(subscribe, planDraft.get, () => EMPTY);
