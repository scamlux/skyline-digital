import type { ProjectType, Urgency } from "./types";

/**
 * PRICING CONFIGURATION — single source of truth for all money & timelines.
 *
 * ⚠️ DRAFT VALUES. Numbers below are placeholders pending sign-off from the
 * product owner. Change them here only — never hardcode prices in UI or the
 * engine. All money in USD; `weeks` are additive effort weights.
 */

/** Base price + baseline duration per project type. */
export const basePrices: Record<ProjectType, { price: number; weeks: number }> = {
  website: { price: 700, weeks: 2 },
  webApp: { price: 1500, weeks: 4 },
  mobileApp: { price: 2500, weeks: 6 },
  ai: { price: 2000, weeks: 4 },
  automation: { price: 1200, weeks: 3 },
  uiux: { price: 800, weeks: 2 },
  other: { price: 1000, weeks: 3 },
};

/** A selectable feature: incremental price and added effort in weeks. */
export interface FeatureDef {
  price: number;
  weeks: number;
}

/**
 * Feature catalog. Every feature key that can appear in a configuration must
 * be defined here. The wizard shows a subset per project type (see
 * `featuresByType`), but pricing is driven solely by this map.
 */
export const features: Record<string, FeatureDef> = {
  // Website
  landing: { price: 300, weeks: 1 },
  corporate: { price: 600, weeks: 2 },
  ecommerce: { price: 900, weeks: 3 },
  personalAccount: { price: 500, weeks: 2 },
  adminPanel: { price: 400, weeks: 1.5 },
  blog: { price: 250, weeks: 1 },
  multilingual: { price: 150, weeks: 0.5 },
  payment: { price: 500, weeks: 1.5 },
  apiIntegration: { price: 350, weeks: 1 },
  animations: { price: 300, weeks: 1 },

  // AI
  aiChatbot: { price: 600, weeks: 2 },
  rag: { price: 900, weeks: 2.5 },
  knowledgeBase: { price: 500, weeks: 1.5 },
  fileProcessing: { price: 450, weeks: 1.5 },
  voice: { price: 700, weeks: 2 },
  imageUnderstanding: { price: 650, weeks: 2 },
  aiAutomation: { price: 550, weeks: 1.5 },

  // Mobile
  ios: { price: 800, weeks: 2.5 },
  android: { price: 800, weeks: 2.5 },
  authentication: { price: 300, weeks: 1 },
  pushNotifications: { price: 250, weeks: 1 },
  payments: { price: 500, weeks: 1.5 },

  // Automation
  crmIntegration: { price: 500, weeks: 1.5 },
  telegram: { price: 200, weeks: 0.5 },
  whatsapp: { price: 250, weeks: 0.5 },
  workflowAutomation: { price: 600, weeks: 2 },
  reporting: { price: 350, weeks: 1 },

  // UI/UX
  wireframes: { price: 300, weeks: 1 },
  prototype: { price: 400, weeks: 1 },
  designSystem: { price: 700, weeks: 2 },
};

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
    "apiIntegration",
    "animations",
  ],
  webApp: [
    "personalAccount",
    "adminPanel",
    "authentication",
    "payment",
    "apiIntegration",
    "multilingual",
    "animations",
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
  uiux: ["wireframes", "prototype", "designSystem", "animations"],
  other: [],
};

/** Cross-cutting addons (Step 3), available for every project type. */
export const addons: Record<string, FeatureDef> = {
  design: { price: 600, weeks: 1.5 },
  branding: { price: 700, weeks: 1.5 },
  seo: { price: 400, weeks: 1 },
  analytics: { price: 150, weeks: 0.5 },
  support: { price: 500, weeks: 0 },
};

export const addonKeys = Object.keys(addons);

/** Multiplier applied to the pre-urgency total. */
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
