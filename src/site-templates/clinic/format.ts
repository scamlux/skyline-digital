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
