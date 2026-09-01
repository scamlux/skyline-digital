import type {
  PricingResult,
  ProjectConfiguration,
  RoleBreakdownRow,
} from "./types";
import {
  addons,
  baseHours,
  features,
  rangeSpread,
  roundTo,
  urgencyMultipliers,
} from "./rules";
import { ROLE_KEYS, ROLE_RATES, type RoleHours, type RoleKey } from "./roles";

function roundToNearest(value: number, step: number): number {
  return Math.round(value / step) * step;
}

/**
 * Deterministic pricing engine. Open unit-economics: every selected item (base,
 * features, addons) is a set of hours per role; the engine aggregates hours per
 * role, prices each role at Σ(hours × rate), and those role sums add up exactly
 * to the subtotal. This is the ONLY place price is decided — the AI layer
 * explains this number but never changes it.
 *
 * Unknown feature/addon keys contribute 0 (defensive; validation happens
 * upstream via the zod schema). The free-text "Другое" note carries no hours —
 * only a `hasCustom` flag is surfaced.
 */
export function computePricing(config: ProjectConfiguration): PricingResult {
  const base = baseHours[config.projectType] ?? baseHours.other;

  // Collect every priced item, then sum hours per role.
  const items: RoleHours[] = [base];
  for (const key of config.features) {
    const hours = features[key];
    if (hours) items.push(hours);
  }
  for (const key of config.addons) {
    const hours = addons[key];
    if (hours) items.push(hours);
  }

  const totals: Record<RoleKey, number> = {
    pm: 0,
    dev: 0,
    design: 0,
    qa: 0,
    devops: 0,
    content: 0,
  };
  for (const item of items) {
    for (const role of ROLE_KEYS) {
      totals[role] += item[role] ?? 0;
    }
  }

  const roleBreakdown: RoleBreakdownRow[] = ROLE_KEYS.filter(
    (role) => totals[role] > 0,
  ).map((role) => ({
    role,
    hours: totals[role],
    rate: ROLE_RATES[role],
    sum: totals[role] * ROLE_RATES[role],
  }));

  const subtotal = roleBreakdown.reduce((acc, row) => acc + row.sum, 0);

  const urgencyMultiplier = urgencyMultipliers[config.urgency] ?? 1;
  const urgencyAmount = Math.round(subtotal * (urgencyMultiplier - 1));
  const total = subtotal + urgencyAmount;

  const totalMin = roundToNearest(total * (1 - rangeSpread), roundTo);
  const totalMax = roundToNearest(total * (1 + rangeSpread), roundTo);

  // Weeks track hands-on labor (dev + design + qa) at ~28 productive h/week.
  // Urgent work compresses the calendar (×0.7) rather than adding weeks; ceil
  // keeps whole weeks and matches the spec's stated rounding operator.
  const laborHours = totals.dev + totals.design + totals.qa;
  const laborWeeks = Math.ceil(laborHours / 28);
  const estimatedWeeks = Math.max(
    1,
    config.urgency === "urgent" ? Math.ceil(laborWeeks * 0.7) : laborWeeks,
  );

  const hasCustom = (config.customNote ?? "").trim().length > 0;

  return {
    roleBreakdown,
    subtotal,
    urgencyAmount,
    total,
    totalMin,
    totalMax,
    estimatedWeeks,
    hasCustom,
  };
}
