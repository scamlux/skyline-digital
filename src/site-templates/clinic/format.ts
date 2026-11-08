import { formatSum, type Locale } from "../types";

/** Группировка разрядов неразрывным пробелом: «1 250 000». */
export const groupDigits = (n: number) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, " ");

/** Вилка цены: «250 000 – 450 000 сум»; одинаковые границы — одна сумма. */
export function formatRange(min: number, max: number, locale: Locale): string {
  if (min === max) return formatSum(min, locale);
  return `${groupDigits(min)} – ${formatSum(max, locale)}`;
}

/** Подстановка {name} в строку интерфейса. */
export const fill = (template: string, vars: Record<string, string | number>) =>
  template.replace(/\{(\w+)\}/g, (_m, k: string) => String(vars[k] ?? ""));

/** Цена для плитки и карточки: «Бесплатно», «до 450 000 сум» или вилка «от–до». */
export function priceText(min: number, max: number, locale: Locale, words: { free: string; upTo: string }): string {
  if (max === 0) return words.free;
  if (min === 0) return `${words.upTo} ${formatSum(max, locale)}`;
  return formatRange(min, max, locale);
}

/** «1–2 визита»: границы и слово по верхней. */
export function visitsText(min: number, max: number, word: string): string {
  return min === max ? `${max} ${word}` : `${min}–${max} ${word}`;
}

const SCALE: Record<Locale, { k: string; m: string; sum: string }> = {
  ru: { k: "тыс", m: "млн", sum: "сум" },
  en: { k: "k", m: "M", sum: "UZS" },
  uz: { k: "ming", m: "mln", sum: "soʻm" },
};

/**
 * Цена крупными цифрами: «250–450» + «тыс сум», «4,5–9» + «млн сум». Шкала одна на обе границы
 * (по верхней), «от нуля» читается как «до N», бесплатное — словом.
 */
export function priceParts(min: number, max: number, locale: Locale, words: { free: string; upTo: string }): { num: string; unit: string } {
  if (max === 0) return { num: words.free, unit: "" };
  const sc = SCALE[locale];
  // До 2 млн показываем в тысячах («500–1 200 тыс»): так не теряется точность на «0,3–1,2 млн».
  const big = max >= 2_000_000;
  const div = big ? 1_000_000 : 1_000;
  const sep = locale === "en" ? "." : ",";
  const fmt = (n: number) => {
    const v = Math.round((n / div) * 10) / 10;
    return v >= 1000 ? groupDigits(v) : v.toString().replace(".", sep);
  };
  const unit = `${big ? sc.m : sc.k} ${sc.sum}`;
  if (min === 0) return { num: `${words.upTo} ${fmt(max)}`, unit };
  return { num: min === max ? fmt(max) : `${fmt(min)}–${fmt(max)}`, unit };
}
