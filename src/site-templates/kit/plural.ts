import type { Locale } from "../types";

type Forms = Partial<Record<Intl.LDMLPluralRule, string>>;

/** Форма слова по числу: ru one/few/many, en — one/other, uz после числа не склоняется. */
export function plural(locale: Locale, n: number, forms: Forms): string {
  const rule = new Intl.PluralRules(locale).select(n);
  return forms[rule] ?? forms.other ?? forms.many ?? Object.values(forms)[0] ?? "";
}
