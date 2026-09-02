import type { Company, Grade, ScoreResult, Signals, WebStatus } from "./types";

/**
 * Deterministic 100-point web-presence scoring (docs/radar/IMPLEMENTATION.md).
 *
 * A pure function of the collected {@link Signals} — no network, clock, or
 * randomness — so two runs over the same signals always agree.
 *
 *   website reachable  40
 *   email found        20
 *   social media       15
 *   CTA / analytics    10
 *   domain age ≥ 2y    10
 *   HTTPS               5
 *
 * Grades: A ≥ 70, B 40–69, C < 40.
 */

export const SCORE_WEIGHTS = {
  website: 40,
  email: 20,
  social: 15,
  ctaOrAnalytics: 10,
  domainAge: 10,
  https: 5,
} as const;

/** Signals derivable from the raw collected fields alone (no network). */
export function baseSignals(
  c: Pick<Company, "website" | "email" | "socialLinks">,
): Signals {
  return {
    websiteReachable: false,
    hasEmail: Boolean(c.email),
    hasSocial: (c.socialLinks?.length ?? 0) > 0,
    hasCta: false,
    hasAnalytics: false,
    domainAgeYears: null,
    https: false,
  };
}

/** Total points in [0,100]. */
export function scoreValue(s: Signals): number {
  let pts = 0;
  if (s.websiteReachable) pts += SCORE_WEIGHTS.website;
  if (s.hasEmail) pts += SCORE_WEIGHTS.email;
  if (s.hasSocial) pts += SCORE_WEIGHTS.social;
  if (s.hasCta || s.hasAnalytics) pts += SCORE_WEIGHTS.ctaOrAnalytics;
  if ((s.domainAgeYears ?? 0) >= 2) pts += SCORE_WEIGHTS.domainAge;
  if (s.https) pts += SCORE_WEIGHTS.https;
  return pts;
}

/** Points → grade. Never null. */
export function gradeOf(points: number): Grade {
  if (points >= 70) return "A";
  if (points >= 40) return "B";
  return "C";
}

export function scoreCompany(signals: Signals): Grade {
  return gradeOf(scoreValue(signals));
}

export function scoreResult(signals: Signals, webStatus: WebStatus): ScoreResult {
  return { grade: scoreCompany(signals), signals, webStatus };
}
