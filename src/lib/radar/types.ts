/** Radar domain types — shared across collectors, scoring, store and admin. */

/**
 * Industry key. Open string: industries live in the radar_queries table and
 * are editable from the admin panel; "dentistry"/"auto"/"beauty" are the
 * seeded defaults, not a closed set.
 */
export type Industry = string;
export type Grade = "A" | "B" | "C";
export type Region = "uz" | "kz" | "tj";
export type RadarSource =
  | "google"
  | "yandex"
  | "yellowpages"
  | "gigal"
  | "olx"
  | "2gis";

/** Outcome of the (timeout-safe) website check. Never blocks scoring. */
export type WebStatus = "ok" | "timeout" | "unreachable" | "no_site" | "error";

export const INDUSTRIES: Industry[] = ["dentistry", "auto", "beauty"];
export const RADAR_SOURCES: RadarSource[] = [
  "google",
  "yandex",
  "yellowpages",
  "gigal",
  "olx",
  "2gis",
];

/**
 * Web-presence signals — inputs to the deterministic 100-point score
 * (docs/radar/IMPLEMENTATION.md): website 40, email 20, social 15,
 * cta/analytics 10, domain-age≥2y 10, https 5.
 */
export interface Signals {
  /** Site responded 2xx — the dominant signal (40 pts). */
  websiteReachable: boolean;
  hasEmail: boolean;
  hasSocial: boolean;
  /** A booking/call/order CTA on the page. */
  hasCta: boolean;
  /** Analytics/pixel present (GA, Metrika, Meta Pixel…). */
  hasAnalytics: boolean;
  /** Years since domain registration; null when unknown. */
  domainAgeYears: number | null;
  /** Final URL is served over HTTPS. */
  https: boolean;
}

/** A discovered company, before and after enrichment. */
export interface Company {
  name: string;
  phone: string | null;
  industry: Industry;
  city: string | null;
  website: string | null;
  email: string | null;
  socialLinks: string[];
  source: RadarSource;
  sourceUrl: string | null;
  geo: { lat: number; lng: number } | null;
  /** Filled by enrich/score; optional on freshly-collected rows. */
  signals?: Signals;
  webStatus?: WebStatus;
  grade?: Grade;
}

export interface ScoreResult {
  grade: Grade;
  signals: Signals;
  webStatus: WebStatus;
}

export interface CollectorResult {
  source: RadarSource;
  industry: Industry;
  companies: Company[];
  errors: string[];
  /** True when robots.txt / bot-protection blocked the source entirely. */
  blocked?: boolean;
}

export interface CollectorOptions {
  maxResults?: number;
  log?: (msg: string) => void;
  /** Cities to sweep (source-dependent); defaults per collector. */
  cities?: string[];
  /** Search phrases for the industry; overrides collector defaults. */
  keywords?: string[];
  region?: Region;
}

/** A dynamic industry definition (radar_queries row). */
export interface QueryDef {
  key: Industry;
  label: string;
  keywords: string[];
  cities: string[] | null;
  active: boolean;
}
