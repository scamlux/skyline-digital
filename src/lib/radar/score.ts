import type { Company, Grade, ScoreResult, Signals, WebStatus } from "./types";

/**
 * Deterministic web-presence scoring (docs/adr/0002-radar-engine.md §2).
 *
 * The grade is a pure function of the collected {@link Signals} — no network,
 * no clock, no randomness — so two runs over the same signals always agree.
 * Network-dependent facts (site reachable, has CTA, domain age, responsive) are
 * gathered separately in the timeout-safe `enrich` step and passed in here.
 */

/** Signals derivable from the raw collected fields alone (no network). */
export function baseSignals(
  c: Pick<Company, "website" | "email" | "socialLinks">,
): Signals {
  return {
    hasWebsite: Boolean(c.website),
    hasEmail: Boolean(c.email),
    hasSocial: (c.socialLinks?.length ?? 0) > 0,
    hasCta: false,
    domainAgeYears: null,
    responsive: false,
  };
}

/** Count of the four boolean presence signals. */
export function signalCount(s: Signals): number {
  return [s.hasWebsite, s.hasEmail, s.hasSocial, s.hasCta].filter(Boolean).length;
}

/**
 * Signals → grade. Never returns null.
 * - A: 3+ signals AND a responsive site (hot — established web presence)
 * - B: 1–2 signals (warm — some presence to improve)
 * - C: no signals (cold — greenfield opportunity)
 */
export function scoreCompany(signals: Signals): Grade {
  const count = signalCount(signals);
  if (count >= 3 && signals.responsive) return "A";
  if (count >= 1) return "B";
  return "C";
}

export function scoreResult(signals: Signals, webStatus: WebStatus): ScoreResult {
  return { grade: scoreCompany(signals), signals, webStatus };
}
