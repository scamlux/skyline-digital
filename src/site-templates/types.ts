/**
 * Общие типы шаблонов сайтов для бизнеса (/sites/*).
 *
 * Шаблон самодостаточен: свои данные, свои тексты (3 языка), свой CSS в
 * public/templates/. Ничего из админки, базы и next-intl сайта студии он не
 * импортирует — поэтому его можно вынести на хостинг клиента как есть (ADR 0009).
 */
export type Locale = "ru" | "en" | "uz";
export const LOCALES: Locale[] = ["ru", "en", "uz"];

/** Строка на трёх языках. Узбекский — латиницей, с ʻ (U+02BB). */
export type L = Record<Locale, string>;

export const pick = (l: L, locale: Locale): string => l[locale] ?? l.ru;

/** «65 000 сум»: неразрывные пробелы, без Intl — одинаково на сервере и в браузере. */
export function formatSum(value: number, locale: Locale): string {
  const n = String(Math.round(value)).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return locale === "ru" ? `${n} сум` : locale === "uz" ? `${n} soʻm` : `${n} UZS`;
}

export type StyleId = "a" | "b";
export const STYLE_IDS: StyleId[] = ["a", "b"];

/** Пропсы любого шаблона. */
export interface TemplateProps<D> {
  data: D;
  locale: Locale;
  style: StyleId;
  /** Ссылки на тот же сайт на других языках (в демо — свои, на хостинге клиента — свои). */
  localeHrefs: Record<Locale, string>;
}
