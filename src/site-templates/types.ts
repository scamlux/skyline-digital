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

/**
 * Режим показа шаблона. "demo" — витрина студии (/sites): пометки «демо», вымышленные отзывы и цифры.
 * "client" — настоящий сайт клиента (экспорт, ADR 0009): ни одной демо-пометки, отзывы, оценка, цифры
 * и акция показываются только если владелец дал настоящие (site.config.ts), иначе блока нет.
 */
export type SiteMode = "demo" | "client";

/** Пропсы любого шаблона. */
export interface TemplateProps<D> {
  data: D;
  locale: Locale;
  style: StyleId;
  /** Ссылки на тот же сайт на других языках (в демо — свои, на хостинге клиента — свои). */
  localeHrefs: Record<Locale, string>;
  /** По умолчанию "demo": студия ничего не передаёт, экспорт передаёт "client". */
  mode?: SiteMode;
  /**
   * Настоящий контент клиента (только в режиме "client"). Отзывы, оценка, цифры и акция берутся
   * ТОЛЬКО отсюда: вымышленные из `data` в режиме "client" не показываются никогда.
   */
  client?: ClientContent;
}

/** Настоящий отзыв клиента из site.config.ts. Звёзд у него нет: оценку отзыва владелец не задаёт. */
export interface ClientReview {
  name: string;
  text: L;
  /** Подпись «когда» или «откуда» (необязательна). */
  when?: L;
  /** Ссылка на отзыв в первоисточнике (2ГИС, Google Maps…). */
  url?: string;
}

/** Общая оценка бизнеса с указанием, откуда она взята. */
export interface ClientRating {
  /** 0…5. */
  value: number;
  count: number;
  /** Где собрана оценка: «Google Maps», «2ГИС»… */
  source: string;
  url?: string;
}

/** Настоящая цифра клиента («9 лет», «12 000 гостей»): значение строкой, как оно должно выглядеть. */
export interface ClientStat {
  value: string;
  label: L;
}

/** Всё «настоящее», что владелец может дать сайту сверх названия и контактов (site.config.ts). */
export interface ClientContent {
  reviews: ClientReview[];
  rating?: ClientRating;
  stats: ClientStat[];
  /** Настоящая акция: показывается вместо демо-баннера. */
  promo?: L;
}
