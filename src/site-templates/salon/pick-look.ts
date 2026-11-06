import { basketOf, masterDays, mastersFor, visibleServices, type ScheduleData, type SalonOverrides } from "./schedule";

/**
 * «Подбор образа»: три вопроса → образ из лукбука, услуги, мастер. Чистая функция без React:
 * рекомендация зависит от правок владельца (скрытая услуга не предлагается, мастер без рабочих
 * дней не назначается), поэтому сайт и тесты считают её одним кодом.
 */
export type Who = "men" | "women";
export type Vibe = "short" | "bold" | "classic";
export type Care = "yes" | "no";

export interface QuizAnswers {
  who: Who;
  vibe: Vibe;
  /** Мужчинам — борода, женщинам — уход за волосами. */
  care: Care;
}

export interface Recommendation {
  lookId: string;
  serviceIds: string[];
  masterId: string | null;
}

/** Образ и услуги по ответам. Для мужчин «с бородой» — образ бороды и комплекс услуг. */
function plan(a: QuizAnswers): { lookId: string; serviceIds: string[] } {
  if (a.who === "men") {
    const cut = a.vibe === "bold" ? "fade" : a.vibe === "classic" ? "classic" : "mcut";
    if (a.care === "yes") {
      return { lookId: "w4", serviceIds: a.vibe === "short" ? ["combo"] : [cut, "beard"] };
    }
    return { lookId: a.vibe === "bold" ? "w1" : a.vibe === "classic" ? "w2" : "w3", serviceIds: [cut] };
  }
  const base = a.vibe === "short" ? { lookId: "w5", serviceIds: ["wcut"] } : a.vibe === "classic" ? { lookId: "w6", serviceIds: ["wcut", "wstyle"] } : { lookId: "w6", serviceIds: ["wcolor", "wstyle"] };
  return a.care === "yes" ? { ...base, serviceIds: [...base.serviceIds, "wcare"] } : base;
}

/** Мастер для набора услуг: предпочтительный (из лукбука), если ведёт всё и принимает; иначе первый подходящий. */
export function bestMaster(data: ScheduleData, ov: SalonOverrides, serviceIds: string[], preferredId?: string): string | null {
  const able = mastersFor(data, serviceIds).filter((m) => masterDays(m, ov).length > 0);
  return (able.find((m) => m.id === preferredId) ?? able[0])?.id ?? null;
}

export function recommend(data: ScheduleData, ov: SalonOverrides, answers: QuizAnswers): Recommendation {
  const p = plan(answers);
  let { serviceIds } = p;
  let basket = basketOf(data, ov, serviceIds);
  if (basket.ids.length === 0) {
    // Все предложенные услуги скрыты владельцем — берём первую видимую услугу нужного зала.
    const first = visibleServices(data, ov).find((s) => data.masters.some((m) => m.serviceIds.includes(s.id) && (answers.who === "women") === m.serviceIds.includes("wcut")));
    serviceIds = first ? [first.id] : [];
    basket = basketOf(data, ov, serviceIds);
  }
  const look = data.looks.find((l) => l.id === p.lookId);
  return { lookId: p.lookId, serviceIds: basket.ids, masterId: bestMaster(data, ov, basket.ids, look?.masterId) };
}
