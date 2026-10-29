import type { Locale } from "../types";

type Forms = Partial<Record<Intl.LDMLPluralRule, string>>;

/** Форма слова по числу: ru — one/few/many, en — one/other, uz после числа не склоняется. */
export function plural(locale: Locale, n: number, forms: Forms): string {
  const rule = new Intl.PluralRules(locale).select(n);
  return forms[rule] ?? forms.other ?? forms.many ?? Object.values(forms)[0] ?? "";
}

/** Слова для фразы-вывода в кабинете: подставляются рядом с числами. */
export const words: Record<"views" | "calls" | "telegram" | "leads", Record<Locale, Forms>> = {
  views: {
    ru: { one: "визит", few: "визита", many: "визитов", other: "визита" },
    en: { one: "visit", other: "visits" },
    uz: { other: "ta tashrif" },
  },
  calls: {
    ru: { one: "нажатие", few: "нажатия", many: "нажатий", other: "нажатия" },
    en: { one: "tap", other: "taps" },
    uz: { other: "marta" },
  },
  telegram: {
    ru: { one: "переход", few: "перехода", many: "переходов", other: "перехода" },
    en: { one: "click", other: "clicks" },
    uz: { other: "ta oʻtish" },
  },
  leads: {
    ru: { one: "заявка", few: "заявки", many: "заявок", other: "заявки" },
    en: { one: "booking request", other: "booking requests" },
    uz: { other: "ta soʻrov" },
  },
};
