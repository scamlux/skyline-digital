import { basketOf, masterDays, mastersFor, visibleServices, type ScheduleData, type SalonOverrides } from "./schedule";

/**
 * «Подбор образа»: два ответа → образ из лукбука, услуги, мастер. Чистая функция без React:
 * таблица результатов лежит в данных бизнеса, а рекомендация зависит от правок владельца
 * (скрытая услуга не предлагается, мастер без рабочих дней не назначается), поэтому сайт и
 * тесты считают её одним кодом.
 */
export type QuizAnswers = [string, string];

export interface Recommendation {
  lookId: string;
  serviceIds: string[];
  masterId: string | null;
}

/** Мастер для набора услуг: предпочтительный (из лукбука), если ведёт всё и принимает; иначе первый подходящий. */
export function bestMaster(data: ScheduleData, ov: SalonOverrides, serviceIds: string[], preferredId?: string): string | null {
  const able = mastersFor(data, serviceIds).filter((m) => masterDays(m, ov).length > 0);
  return (able.find((m) => m.id === preferredId) ?? able[0])?.id ?? null;
}

export function recommend(data: ScheduleData, ov: SalonOverrides, answers: QuizAnswers): Recommendation {
  const plan = data.quizResults[answers.join(".")] ?? Object.values(data.quizResults)[0];
  let basket = basketOf(data, ov, plan.serviceIds);
  if (basket.ids.length === 0) {
    // Все предложенные услуги скрыты владельцем: берём первую видимую услугу, которую кто-то ведёт.
    const first = visibleServices(data, ov).find((s) => data.masters.some((m) => m.serviceIds.includes(s.id)));
    basket = basketOf(data, ov, first ? [first.id] : []);
  }
  const look = data.looks.find((l) => l.id === plan.lookId);
  return { lookId: plan.lookId, serviceIds: basket.ids, masterId: bestMaster(data, ov, basket.ids, look?.masterId) };
}
