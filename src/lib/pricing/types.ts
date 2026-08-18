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
}

/** Deterministic output of the pricing engine. All money values in USD. */
export interface PricingResult {
  basePrice: number;
  addonsPrice: number;
  urgencyMultiplier: number;
  totalMin: number;
  totalMax: number;
  estimatedWeeks: number;
}
