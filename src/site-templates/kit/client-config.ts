import { plural } from "./plural";
import type { ClientContent, ClientRating, L, Locale } from "../types";

/**
 * Настоящий контент клиента из site.config.ts (экспорт, ADR 0009) → вид, который понимают шаблоны.
 * Отзывы, оценка, цифры и акция не придумываются: нет в конфиге значит нет на сайте.
 */

/** Строка для одного языка или сразу для трёх (владельцу чаще достаточно одной). */
export type Multilang = string | L;

export interface ConfigReview {
  author: string;
  text: Multilang;
  /** Ссылка на отзыв в первоисточнике (2ГИС, Google Maps…). */
  url?: string;
}

export interface ConfigStat {
  value: string;
  label: Multilang;
}

/** Необязательная «настоящая» часть site.config.ts. */
export interface ConfigContent {
  reviews?: ConfigReview[];
  rating?: ClientRating;
  stats?: ConfigStat[];
  promo?: Multilang;
}

const toL = (v: Multilang): L => (typeof v === "string" ? { ru: v, en: v, uz: v } : v);
const filled = (v: Multilang): boolean => (typeof v === "string" ? v.trim() !== "" : Object.values(v).some((s) => s.trim() !== ""));

/** Проверяет и приводит значения конфига. Неверная оценка — ошибка сборки, а не молчаливая подстановка. */
export function normalizeClientContent(config: ConfigContent): ClientContent {
  const { rating } = config;
  if (rating && (!(rating.value >= 0 && rating.value <= 5) || !Number.isInteger(rating.count) || rating.count < 1 || rating.source.trim() === "")) {
    throw new Error("site.config.ts: rating — value от 0 до 5, count целое число больше 0, source — название источника (например «Google Maps»).");
  }
  return {
    reviews: (config.reviews ?? [])
      .filter((r) => r.author.trim() !== "" && filled(r.text))
      .map((r) => ({ name: r.author.trim(), text: toL(r.text), url: r.url || undefined })),
    rating,
    stats: (config.stats ?? []).filter((s) => s.value.trim() !== "" && filled(s.label)).map((s) => ({ value: s.value.trim(), label: toL(s.label) })),
    promo: config.promo !== undefined && filled(config.promo) ? toL(config.promo) : undefined,
  };
}

const REVIEW_WORDS: Record<Locale, Partial<Record<Intl.LDMLPluralRule, string>>> = {
  ru: { one: "отзыв", few: "отзыва", many: "отзывов", other: "отзыва" },
  en: { one: "review", other: "reviews" },
  uz: { other: "ta fikr" },
};

/** «4,9 из 5 · 128 отзывов · Google Maps». Десятичный разделитель по языку. */
export function ratingText(rating: ClientRating, locale: Locale): string {
  const value = String(Math.round(rating.value * 10) / 10);
  const num = locale === "en" ? value : value.replace(".", ",");
  const score = locale === "ru" ? `${num} из 5` : locale === "en" ? `${num} out of 5` : `5 dan ${num}`;
  return `${score} · ${rating.count} ${plural(locale, rating.count, REVIEW_WORDS[locale])} · ${rating.source}`;
}
