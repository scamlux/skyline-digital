import type { ProjectType, Urgency } from "./types";
import { roleHoursCost, type RoleHours } from "./roles";

/**
 * PRICING CONFIGURATION — single source of truth for all effort & timelines.
 *
 * Open unit-economics: every item (project-type base, feature, addon) is
 * defined as HOURS per role. Price is derived by the engine as
 * Σ(hours × role rate) — see `roles.ts`. There are no flat `price` values.
 * Never hardcode money in the UI or the engine.
 */

/** Baseline effort per project type, in hours per role. */
export const baseHours: Record<ProjectType, RoleHours> = {
  website: { pm: 5, dev: 32, design: 14, qa: 6, devops: 2 },
  webApp: { pm: 10, dev: 70, design: 20, qa: 16, devops: 6 },
  mobileApp: { pm: 12, dev: 90, design: 24, qa: 20, devops: 6 },
  ai: { pm: 8, dev: 60, design: 8, qa: 12, devops: 8 },
  automation: { pm: 6, dev: 40, design: 4, qa: 8, devops: 6 },
  uiux: { pm: 4, dev: 6, design: 40, qa: 4 },
  other: { pm: 2, dev: 8, design: 2, qa: 2 },
};

/**
 * "From $X" starting price for a project type — its base hours, priced, then
 * rounded to a clean $10 so the marketing "от $X" labels read tidily ("от
 * $1,000", not "от $1,002"). Display-only; the engine always prices from exact
 * hours.
 */
export function basePriceUsd(type: ProjectType): number {
  const exact = roleHoursCost(baseHours[type] ?? baseHours.other);
  return Math.round(exact / 10) * 10;
}

/**
 * Feature catalog — hours per role. Every feature key that can appear in a
 * configuration must be defined here. The wizard shows a subset per project
 * type (see `featuresByType`), but pricing is driven solely by this map.
 */
export const features: Record<string, RoleHours> = {
  // Website / general
  landing: { dev: 14, design: 8, qa: 2 },
  corporate: { pm: 3, dev: 24, design: 12, qa: 4 },
  ecommerce: { pm: 4, dev: 40, design: 14, qa: 8 },
  personalAccount: { pm: 2, dev: 24, design: 8, qa: 6 },
  adminPanel: { dev: 20, design: 6, qa: 4 },
  blog: { dev: 12, design: 6, qa: 2 },
  multilingual: { dev: 8, design: 2, qa: 2 },
  payment: { pm: 2, dev: 16, qa: 6 },
  apiIntegration: { pm: 2, dev: 16, qa: 4 },
  animations: { dev: 12, design: 6 },

  // AI
  aiChatbot: { pm: 2, dev: 28, qa: 6 },
  rag: { pm: 3, dev: 40, qa: 8, devops: 4 },
  knowledgeBase: { dev: 22, qa: 4, devops: 2 },
  fileProcessing: { dev: 20, qa: 6 },
  voice: { dev: 32, qa: 6, devops: 2 },
  imageUnderstanding: { dev: 30, qa: 6 },
  aiAutomation: { dev: 24, qa: 6, devops: 2 },

  // Mobile
  ios: { dev: 40, design: 6, qa: 8 },
  android: { dev: 40, design: 6, qa: 8 },
  authentication: { dev: 14, qa: 4 },
  pushNotifications: { dev: 12, qa: 4 },
  payments: { pm: 2, dev: 22, qa: 6 },

  // Automation
  crmIntegration: { pm: 2, dev: 22, qa: 6 },
  telegram: { dev: 10, qa: 2 },
  whatsapp: { dev: 12, qa: 2 },
  workflowAutomation: { pm: 2, dev: 28, qa: 6 },
  reporting: { dev: 16, design: 2, qa: 4 },

  // UI/UX
  wireframes: { pm: 2, design: 20 },
  prototype: { dev: 4, design: 24 },
  designSystem: { dev: 6, design: 40 },

  // New options
  paymeClickUzum: { pm: 2, dev: 20, qa: 6 },
  integration1c: { pm: 3, dev: 28, qa: 8 },
  webgl3d: { dev: 20, design: 10 },
  booking: { dev: 22, design: 4, qa: 4 },
};

/**
 * Free-text "Другое" sentinel. It carries no hours (priced on request) and is
 * never part of the deterministic sum — the engine only surfaces a flag. The
 * wizard collects the text into `configuration.customNote`.
 */
export const CUSTOM_KEY = "custom";

/** Feature keys surfaced in Step 2 per project type. */
export const featuresByType: Record<ProjectType, string[]> = {
  website: [
    "landing",
    "corporate",
    "ecommerce",
    "personalAccount",
    "adminPanel",
    "blog",
    "multilingual",
    "payment",
    "paymeClickUzum",
    "apiIntegration",
    "integration1c",
    "booking",
    "animations",
    "webgl3d",
  ],
  webApp: [
    "personalAccount",
    "adminPanel",
    "authentication",
    "payment",
    "paymeClickUzum",
    "apiIntegration",
    "integration1c",
    "booking",
    "multilingual",
    "animations",
    "webgl3d",
    "reporting",
  ],
  mobileApp: [
    "ios",
    "android",
    "authentication",
    "pushNotifications",
    "payments",
    "personalAccount",
    "apiIntegration",
    "adminPanel",
  ],
  ai: [
    "aiChatbot",
    "rag",
    "knowledgeBase",
    "fileProcessing",
    "voice",
    "imageUnderstanding",
    "aiAutomation",
    "apiIntegration",
  ],
  automation: [
    "crmIntegration",
    "telegram",
    "whatsapp",
    "workflowAutomation",
    "reporting",
    "apiIntegration",
  ],
  uiux: ["wireframes", "prototype", "designSystem", "animations", "webgl3d"],
  other: [],
};

/** Cross-cutting addons (Step 3), available for every project type. */
export const addons: Record<string, RoleHours> = {
  design: { pm: 2, design: 32 },
  branding: { design: 36, content: 8 },
  seo: { pm: 2, dev: 8, content: 12 },
  analytics: { dev: 8, qa: 2 },
  support: { pm: 4, dev: 8 },
};

export const addonKeys = Object.keys(addons);

/** Multiplier applied to the subtotal to derive the urgency surcharge line. */
export const urgencyMultipliers: Record<Urgency, number> = {
  normal: 1,
  urgent: 1.35,
};

/**
 * The estimate is presented as a range. `min` = total * (1 - spread),
 * `max` = total * (1 + spread). Rounded to `roundTo`.
 */
export const rangeSpread = 0.12;
export const roundTo = 50;
