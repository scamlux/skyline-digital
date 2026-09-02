/** Radar domain types — shared across collectors, scoring, store and admin. */

export type Industry = "dentistry" | "auto" | "beauty";
export type Grade = "A" | "B" | "C";
export type RadarSource = "pc" | "olx" | "gigal" | "yellowpages" | "2gis";

/** Outcome of the (timeout-safe) website check. Never blocks scoring. */
export type WebStatus = "ok" | "timeout" | "unreachable" | "no_site" | "error";

export const INDUSTRIES: Industry[] = ["dentistry", "auto", "beauty"];
export const RADAR_SOURCES: RadarSource[] = ["pc", "olx", "gigal", "yellowpages", "2gis"];

/** Web-presence signals — the inputs to the deterministic grade. */
export interface Signals {
  hasWebsite: boolean;
  hasEmail: boolean;
  hasSocial: boolean;
  hasCta: boolean;
  /** Years since domain registration; null when unknown. */
  domainAgeYears: number | null;
  /** Mobile viewport present / layout doesn't overflow. */
  responsive: boolean;
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
}
