/** All project types offered in the calculator (Step 1). */
export type ProjectType =
  | "website"
  | "webApp"
  | "mobileApp"
  | "ai"
  | "automation"
  | "uiux"
  | "other";

/** Delivery speed choice (Step 4). */
export type Urgency = "normal" | "urgent";

/**
 * Structured configuration produced by the calculator wizard and consumed by
 * the pricing engine. Feature/addon keys are validated against the catalog in
 * `rules.ts`; unknown keys are ignored by the engine (priced at 0).
 */
export interface ProjectConfiguration {
  projectType: ProjectType;
  /** Feature keys selected in Step 2 (depend on projectType). */
  features: string[];
  /** Cross-cutting addon keys selected in Step 3. */
  addons: string[];
  urgency: Urgency;
  /** Free-text "Другое" note — priced on request, contributes 0 to the sum. */
  customNote?: string;
}

/** One aggregated role row in the open unit-economics breakdown. */
export interface RoleBreakdownRow {
  /** Role key (see `roles.ts`). */
  role: import("./roles").RoleKey;
  /** Total hours across base + features + addons for this role. */
  hours: number;
  /** Hourly USD rate for this role. */
  rate: number;
  /** hours × rate, in USD. */
  sum: number;
}

/** Deterministic output of the pricing engine. All money values in USD. */
export interface PricingResult {
  /** Per-role hours × rate rows; only roles with hours > 0. Sums to subtotal. */
  roleBreakdown: RoleBreakdownRow[];
  /** Σ of roleBreakdown sums. */
  subtotal: number;
  /** Urgency surcharge (subtotal × 35%) as a separate line, else 0. */
  urgencyAmount: number;
  /** subtotal + urgencyAmount. */
  total: number;
  totalMin: number;
  totalMax: number;
  estimatedWeeks: number;
  /** True when the configuration carries a non-empty free-text "Другое" note. */
  hasCustom: boolean;
}
