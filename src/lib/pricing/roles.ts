/**
 * ROLES & HOURLY RATES — the single source of truth for billing rates.
 *
 * Pricing model is open unit-economics: every catalog item (project-type base,
 * feature, addon) is expressed as hours per role, and its price is
 * Σ(hours × role rate). Rates are what the CLIENT pays (margin included), not
 * internal cost. Change rates here only — never hardcode money elsewhere.
 */

/** Billing roles used across the pricing catalog. */
export type RoleKey = "pm" | "dev" | "design" | "qa" | "devops" | "content";

/** Hours a catalog item consumes per role. Absent role = 0 hours. */
export interface RoleHours {
  pm?: number;
  dev?: number;
  design?: number;
  qa?: number;
  devops?: number;
  content?: number;
}

/** Stable role order for deterministic aggregation and display. */
export const ROLE_KEYS: readonly RoleKey[] = [
  "pm",
  "dev",
  "design",
  "qa",
  "devops",
  "content",
] as const;

/** Hourly billing rate in USD per role. */
export const ROLE_RATES: Record<RoleKey, number> = {
  pm: 20,
  dev: 18,
  design: 15,
  qa: 12,
  devops: 22,
  content: 10,
};

/** Russian display labels for role rows in the calculator and the PDF. */
export const ROLE_LABELS: Record<RoleKey, string> = {
  pm: "Проект-менеджер",
  dev: "Разработчик",
  design: "Дизайнер",
  qa: "QA / тестировщик",
  devops: "DevOps",
  content: "Контент-менеджер",
};

/** Total USD cost of a single {@link RoleHours} item: Σ(hours × rate). */
export function roleHoursCost(hours: RoleHours): number {
  let sum = 0;
  for (const role of ROLE_KEYS) {
    sum += (hours[role] ?? 0) * ROLE_RATES[role];
  }
  return sum;
}
