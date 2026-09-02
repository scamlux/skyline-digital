import type { Company, Grade, ScoreResult, Signals, WebStatus } from "./types";

/**
 * Deterministic scoring (docs/radar/IMPLEMENTATION.md).
 *
 * Two layers, both pure (no network/clock/randomness → runs always agree):
 * 1. scoreValue — 100-point WEB-PRESENCE quality: website 40, email 20,
 *    social 15, CTA/analytics 10, domain age ≥2y 10, HTTPS 5.
 * 2. scoreCompany — SALES-PROSPECT grade built on top of it (see below):
 *    hot = contactable but web-less, since we sell websites.
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

/** Contactability facts about a company, derived from raw fields. */
export interface ContactInfo {
  /** Reachable by phone or Telegram. */
  hasContact: boolean;
  /** Runs a Telegram bot (t.me/...bot) — already digitally served. */
  hasTgBot: boolean;
}

const TG_BOT_RE = /t\.me\/[A-Za-z0-9_]*bot(?:[/?]|$)/i;
const TG_LINK_RE = /(?:t\.me|telegram\.me)\//i;

/** Derive contact facts from phone + social links. */
export function contactInfo(c: Pick<Company, "phone" | "socialLinks">): ContactInfo {
  const socials = c.socialLinks ?? [];
  return {
    hasContact: Boolean(c.phone) || socials.some((s) => TG_LINK_RE.test(s)),
    hasTgBot: socials.some((s) => TG_BOT_RE.test(s)),
  };
}

/**
 * Sales-prospect grade — WE SELL WEBSITES, so the hierarchy is inverted from
 * plain web-presence quality:
 *
 * - A (горячие): contactable (phone/Telegram) but NO working website and no
 *   Telegram bot — the perfect "you need a site" prospect.
 * - B (тёплые): contactable, site exists but is weak (web-presence score < 70)
 *   — an upgrade/redesign prospect.
 * - C (холодные): strong web presence (already served), or not contactable.
 */
export function scoreCompany(signals: Signals, contact: ContactInfo): Grade {
  if (!contact.hasContact) return "C";
  if (!signals.websiteReachable && !contact.hasTgBot) return "A";
  if (scoreValue(signals) < 70) return "B";
  return "C";
}

export function scoreResult(
  signals: Signals,
  webStatus: WebStatus,
  contact: ContactInfo,
): ScoreResult {
  return { grade: scoreCompany(signals, contact), signals, webStatus };
}
