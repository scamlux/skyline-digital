import { addonKeys, computePricing, featuresByType, type ProjectType } from "@/lib/pricing";
import type { Quote } from "./types";

/**
 * Цена для возможности — только движком (§7: «сумму считает код, модель —
 * никогда»). ИИ лишь выбирает тип проекта и ключи опций из каталога; чужие
 * ключи отбрасываются, как в touchpoint A.
 */

const TYPES: ProjectType[] = ["website", "webApp", "mobileApp", "ai", "automation", "uiux", "other"];

export function isProjectType(v: unknown): v is ProjectType {
  return typeof v === "string" && (TYPES as string[]).includes(v);
}

/** Ключи, допустимые для типа: фичи типа + общие аддоны. */
export function allowedKeys(type: ProjectType): string[] {
  return [...(featuresByType[type] ?? []), ...addonKeys];
}

export function quoteFor(type: ProjectType, keys: string[]): Quote {
  const allowed = new Set(allowedKeys(type));
  const picked = [...new Set(keys)].filter((k) => allowed.has(k));
  const features = picked.filter((k) => !addonKeys.includes(k));
  const addons = picked.filter((k) => addonKeys.includes(k));
  const r = computePricing({ projectType: type, features, addons, urgency: "normal" });
  return {
    totalMin: r.totalMin,
    totalMax: r.totalMax,
    weeks: r.estimatedWeeks,
    projectType: type,
    features: picked,
  };
}

export function formatQuote(q: Quote): string {
  const usd = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;
  return `${usd(q.totalMin)}–${usd(q.totalMax)}, ~${q.weeks} нед.`;
}
