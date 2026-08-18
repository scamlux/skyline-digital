import type { PricingResult, ProjectConfiguration } from "./types";
import {
  addons,
  basePrices,
  features,
  rangeSpread,
  roundTo,
  urgencyMultipliers,
} from "./rules";

function roundToNearest(value: number, step: number): number {
  return Math.round(value / step) * step;
}

/**
 * Deterministic pricing engine. Given a validated project configuration it
 * returns a fully computed {@link PricingResult}. This is the ONLY place price
 * is decided — the AI layer explains this number but never changes it.
 *
 * Unknown feature/addon keys contribute 0 (defensive; validation happens
 * upstream via zod schema).
 */
export function computePricing(config: ProjectConfiguration): PricingResult {
  const base = basePrices[config.projectType] ?? basePrices.other;

  const featuresPrice = config.features.reduce(
    (sum, key) => sum + (features[key]?.price ?? 0),
    0,
  );
  const featuresWeeks = config.features.reduce(
    (sum, key) => sum + (features[key]?.weeks ?? 0),
    0,
  );

  const addonsPrice = config.addons.reduce(
    (sum, key) => sum + (addons[key]?.price ?? 0),
    0,
  );
  const addonsWeeks = config.addons.reduce(
    (sum, key) => sum + (addons[key]?.weeks ?? 0),
    0,
  );

  const urgencyMultiplier = urgencyMultipliers[config.urgency] ?? 1;

  const basePrice = base.price + featuresPrice;
  const subtotal = basePrice + addonsPrice;
  const total = subtotal * urgencyMultiplier;

  const totalMin = roundToNearest(total * (1 - rangeSpread), roundTo);
  const totalMax = roundToNearest(total * (1 + rangeSpread), roundTo);

  // Urgent work compresses the calendar rather than adding weeks.
  const rawWeeks = base.weeks + featuresWeeks + addonsWeeks;
  const estimatedWeeks = Math.max(
    1,
    Math.round(config.urgency === "urgent" ? rawWeeks * 0.7 : rawWeeks),
  );

  return {
    basePrice,
    addonsPrice,
    urgencyMultiplier,
    totalMin,
    totalMax,
    estimatedWeeks,
  };
}
