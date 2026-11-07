"use client";

import { useSyncExternalStore } from "react";
import type { PlanItem } from "./schedule";

/**
 * План из калькулятора, который уходит в форму записи («Записаться с этим планом»).
 * Живёт только в памяти страницы: калькулятор и форма — разные острова одной страницы,
 * им нужна общая переменная, а не localStorage.
 */
export interface PlanDraft {
  items: PlanItem[];
  /** Предвыбранная услуга (карточка услуги, первая позиция плана). */
  serviceId: string | null;
  /** Предвыбранный врач (кнопка в карточке врача). */
  doctorId: string | null;
  /** Растёт при каждой отправке плана: форма понимает, что пора подхватить новый выбор. */
  nonce: number;
}

const EMPTY: PlanDraft = { items: [], serviceId: null, doctorId: null, nonce: 0 };
let current: PlanDraft = EMPTY;
const listeners = new Set<() => void>();

export const planDraft = {
  get: () => current,
  send(preset: { items?: PlanItem[]; serviceId?: string | null; doctorId?: string | null }) {
    current = { items: preset.items ?? [], serviceId: preset.serviceId ?? preset.items?.[0]?.id ?? null, doctorId: preset.doctorId ?? null, nonce: current.nonce + 1 };
    listeners.forEach((l) => l());
  },
  clear() {
    current = { ...EMPTY, nonce: current.nonce };
    listeners.forEach((l) => l());
  },
};

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

export const usePlanDraft = (): PlanDraft => useSyncExternalStore(subscribe, planDraft.get, () => EMPTY);
