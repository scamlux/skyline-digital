import type {
  AuditScore,
  CategoryScore,
  Finding,
  Grade,
  Measurement,
  ScoreCategory,
  Severity,
} from "./types";

/**
 * Deterministic, side-effect-free scorer — docs/TZ-AUDIT-ENGINE.md §5, v2 in
 * ADR 0009.
 *
 * Each category is scored 0–100 on its own, then weighted into the total
 * (speed 30, conversion 25, mobile 20, seo 15, security 10). Findings carry
 * their impact in TOTAL points so the top-N are genuinely the most damaging.
 * No user-facing text — only i18n keys.
 *
 * v2 vs v1: a "conversion" category (can a visitor call / write / leave a
 * request, is that visible without scrolling, is the site measured and alive),
 * CLS + TBT in speed, `noindex` in SEO, and security headers demoted — they
 * were the most frequent finding (92% of sites) and meant nothing to a
 * business owner.
 *
 * Engine 1 measurements lack the v2 fields: absent metrics are excluded (speed
 * weights renormalise) and absent checks are skipped, so old rows still score.
 *
 * An unreachable measurement gets no score (the UI shows a distinct state); do
 * not call this for `reachable: false`.
 */

export const SCORE_VERSION = "2.0";

export const WEIGHTS: Record<ScoreCategory, number> = {
  speed: 30,
  conversion: 25,
  mobile: 20,
  seo: 15,
  security: 10,
};

/** Display order of categories in the UI and reports. */
export const CATEGORY_ORDER: ScoreCategory[] = ["speed", "conversion", "mobile", "seo", "security"];

/**
 * Lower-is-better thresholds. LCP/CLS/TBT follow Google's "good / needs
 * improvement" bounds; they are now measured under the mobile throttling
 * profile, so they finally mean what they say.
 */
export const SPEED_THRESHOLDS = {
  lcp: { excellent: 2500, acceptable: 4000 },
  tbt: { excellent: 200, acceptable: 600 },
  cls: { excellent: 0.1, acceptable: 0.25 },
  ttfb: { excellent: 800, acceptable: 1800 },
  pageWeight: { excellent: 1_500_000, acceptable: 3_000_000 },
  requests: { excellent: 50, acceptable: 100 },
} as const;

/** Speed sub-weights (sum 1). Missing metrics drop out and the rest renormalise. */
const SPEED_MIX = { lcp: 0.35, tbt: 0.15, cls: 0.15, ttfb: 0.1, pageWeight: 0.15, requests: 0.1 } as const;

type Band = "excellent" | "acceptable" | "poor";

function band(value: number, t: { excellent: number; acceptable: number }): Band {
  if (value <= t.excellent) return "excellent";
  if (value <= t.acceptable) return "acceptable";
  return "poor";
}

const BAND_SCORE: Record<Band, number> = { excellent: 100, acceptable: 60, poor: 15 };

interface RawFinding {
  id: string;
  category: ScoreCategory;
  severity: Severity;
  /** Penalty in this CATEGORY's 0–100 scale. */
  penalty: number;
  titleKey: string;
  detailKey: string;
  values?: Record<string, string | number>;
}

function key(id: string, part: "title" | "detail"): string {
  return `audit.findings.${id}.${part}`;
}

// ————————————————————— speed —————————————————————

type SpeedMetricKey = keyof typeof SPEED_MIX;

function scoreSpeed(m: Measurement): { score: number; raw: RawFinding[] } {
  const s = m.speed;
  const values: Partial<Record<SpeedMetricKey, number>> = {};
  if (s.lcp != null) values.lcp = s.lcp;
  if (s.tbt != null) values.tbt = s.tbt;
  if (s.cls != null) values.cls = s.cls;
  if (s.ttfb != null) values.ttfb = s.ttfb;
  if (s.pageWeightBytes) values.pageWeight = s.pageWeightBytes;
  if (s.requestCount) values.requests = s.requestCount;

  const present = Object.keys(values) as SpeedMetricKey[];
  const mixTotal = present.reduce((a, k) => a + SPEED_MIX[k], 0) || 1;
  const bands = {} as Record<SpeedMetricKey, Band>;
  let score = 0;
  for (const k of present) {
    bands[k] = band(values[k]!, SPEED_THRESHOLDS[k]);
    score += (SPEED_MIX[k] / mixTotal) * BAND_SCORE[bands[k]];
  }
  score = present.length ? Math.round(score) : 60;
  const lost = (k: SpeedMetricKey) => (SPEED_MIX[k] / mixTotal) * (100 - BAND_SCORE[bands[k]]);

  const raw: RawFinding[] = [];
  const push = (k: SpeedMetricKey, id: string, sev: [Severity, Severity], v: Record<string, string | number>) => {
    if (!bands[k] || bands[k] === "excellent") return;
    raw.push({
      id,
      category: "speed",
      severity: bands[k] === "poor" ? sev[0] : sev[1],
      penalty: lost(k),
      titleKey: key(id, "title"),
      detailKey: key(id, "detail"),
      values: v,
    });
  };
  push("lcp", "lcp-slow", ["critical", "major"], { lcp: s.lcp ?? 0 });
  push("tbt", "main-thread-blocked", ["major", "minor"], { tbt: s.tbt ?? 0 });
  push("cls", "layout-shift", ["major", "minor"], { cls: s.cls ?? 0 });
  push("ttfb", "ttfb-slow", ["major", "minor"], { ttfb: s.ttfb ?? 0 });
  push("pageWeight", "page-heavy", ["major", "minor"], { mb: (s.pageWeightBytes / 1_000_000).toFixed(1) });
  push("requests", "too-many-requests", ["minor", "minor"], { count: s.requestCount });

  // Fixable causes — named so the owner (and the estimate) knows what to do.
  // Informational: they explain the slow metrics above, no extra penalty.
  if ((s.legacyImageBytes ?? 0) > 500_000) {
    raw.push({ id: "legacy-images", category: "speed", severity: "minor", penalty: 0, titleKey: key("legacy-images", "title"), detailKey: key("legacy-images", "detail"), values: { mb: ((s.legacyImageBytes ?? 0) / 1_000_000).toFixed(1) } });
  }
  if ((s.uncompressedText ?? 0) > 0) {
    raw.push({ id: "no-compression", category: "speed", severity: "minor", penalty: 0, titleKey: key("no-compression", "title"), detailKey: key("no-compression", "detail"), values: { count: s.uncompressedText ?? 0 } });
  }
  if ((s.renderBlocking ?? 0) > 3) {
    raw.push({ id: "render-blocking", category: "speed", severity: "minor", penalty: 0, titleKey: key("render-blocking", "title"), detailKey: key("render-blocking", "detail"), values: { count: s.renderBlocking ?? 0 } });
  }
  if ((s.uncachedStatic ?? 0) > 5) {
    raw.push({ id: "no-caching", category: "speed", severity: "minor", penalty: 0, titleKey: key("no-caching", "title"), detailKey: key("no-caching", "detail"), values: { count: s.uncachedStatic ?? 0 } });
  }

  // The page never finished loading within the budget. It was measured anyway
  // — and that slowness IS the headline finding.
  if (s.loadTimedOut) {
    const capped = Math.min(score, 25);
    raw.push({
      id: "load-timeout",
      category: "speed",
      severity: "critical",
      penalty: score - capped,
      titleKey: key("load-timeout", "title"),
      detailKey: key("load-timeout", "detail"),
    });
    score = capped;
  }
  return { score, raw };
}

// ————————————————————— conversion —————————————————————

/**
 * Can a visitor who is ready to buy actually reach the business? This is what
 * a small-business owner pays the site for, so it carries a quarter of the score.
 */
function scoreConversion(m: Measurement, now: Date): { score: number; raw: RawFinding[] } {
  const b = m.business;
  const raw: RawFinding[] = [];
  let penalty = 0;
  const add = (p: number, f: Omit<RawFinding, "penalty" | "category">) => {
    penalty += p;
    raw.push({ ...f, category: "conversion", penalty: p });
  };

  const anyContact = b.hasContactForm || b.hasPhoneLink || b.hasMessengerLink;
  if (!anyContact) {
    add(55, { id: "no-contact-action", severity: "critical", titleKey: key("no-contact-action", "title"), detailKey: key("no-contact-action", "detail") });
  } else {
    if (!b.hasPhoneLink) {
      add(15, { id: "no-phone-link", severity: "major", titleKey: key("no-phone-link", "title"), detailKey: key("no-phone-link", "detail") });
    }
    if (!b.hasMessengerLink) {
      add(10, { id: "no-messenger", severity: "minor", titleKey: key("no-messenger", "title"), detailKey: key("no-messenger", "detail") });
    }
  }
  if (b.ctaAboveFold === false && anyContact) {
    add(20, { id: "no-cta-above-fold", severity: "major", titleKey: key("no-cta-above-fold", "title"), detailKey: key("no-cta-above-fold", "detail") });
  }
  if (!b.hasAnalytics) {
    add(15, { id: "no-analytics", severity: "major", titleKey: key("no-analytics", "title"), detailKey: key("no-analytics", "detail") });
  }
  const year = now.getUTCFullYear();
  if (b.copyrightYear != null && b.copyrightYear < year - 1) {
    add(10, { id: "stale-copyright", severity: "minor", titleKey: key("stale-copyright", "title"), detailKey: key("stale-copyright", "detail"), values: { year: b.copyrightYear } });
  }
  if (b.hasPrivacyPolicy === false && b.hasContactForm) {
    add(5, { id: "no-privacy-policy", severity: "minor", titleKey: key("no-privacy-policy", "title"), detailKey: key("no-privacy-policy", "detail") });
  }
  return { score: Math.max(0, 100 - penalty), raw };
}

// ————————————————————— mobile —————————————————————

function scoreMobile(m: Measurement): { score: number; raw: RawFinding[] } {
  const mo = m.mobile;
  const raw: RawFinding[] = [];
  let penalty = 0;
  const add = (p: number, f: Omit<RawFinding, "penalty" | "category">) => {
    penalty += p;
    raw.push({ ...f, category: "mobile", penalty: p });
  };

  if (!mo.hasViewportMeta) {
    add(50, { id: "no-viewport", severity: "critical", titleKey: key("no-viewport", "title"), detailKey: key("no-viewport", "detail") });
  }
  if (mo.horizontalOverflow) {
    add(25, { id: "horizontal-overflow", severity: "major", titleKey: key("horizontal-overflow", "title"), detailKey: key("horizontal-overflow", "detail") });
  }
  if (mo.tapTargetsTooSmall > 10) {
    add(15, { id: "tap-targets-small", severity: "minor", titleKey: key("tap-targets-small", "title"), detailKey: key("tap-targets-small", "detail"), values: { count: mo.tapTargetsTooSmall } });
  }
  if (mo.baseFontSizePx != null && mo.baseFontSizePx < 14) {
    add(10, { id: "font-too-small", severity: "minor", titleKey: key("font-too-small", "title"), detailKey: key("font-too-small", "detail"), values: { px: mo.baseFontSizePx } });
  }
  return { score: Math.max(0, 100 - penalty), raw };
}

// ————————————————————— security —————————————————————

function scoreSecurity(m: Measurement): { score: number; raw: RawFinding[] } {
  const se = m.security;
  const raw: RawFinding[] = [];
  let penalty = 0;
  const add = (p: number, f: Omit<RawFinding, "penalty" | "category">) => {
    penalty += p;
    raw.push({ ...f, category: "security", penalty: p });
  };

  if (!se.https) {
    add(60, { id: "no-https", severity: "critical", titleKey: key("no-https", "title"), detailKey: key("no-https", "detail") });
  } else if (!se.httpRedirectsToHttps) {
    add(10, { id: "no-http-redirect", severity: "minor", titleKey: key("no-http-redirect", "title"), detailKey: key("no-http-redirect", "detail") });
  }
  const missing = Object.values(se.securityHeaders).filter((v) => !v).length;
  if (missing > 0) {
    // Hygiene, not a business risk: small penalty in a 10-weight category.
    add(Math.min(12, missing * 3), { id: "missing-security-headers", severity: "minor", titleKey: key("missing-security-headers", "title"), detailKey: key("missing-security-headers", "detail"), values: { count: missing } });
  }
  if (se.mixedContent) {
    add(15, { id: "mixed-content", severity: "major", titleKey: key("mixed-content", "title"), detailKey: key("mixed-content", "detail") });
  }
  if (se.certExpiresInDays != null && se.certExpiresInDays < 14) {
    add(15, { id: "cert-expiring", severity: "major", titleKey: key("cert-expiring", "title"), detailKey: key("cert-expiring", "detail"), values: { days: se.certExpiresInDays } });
  }
  return { score: Math.max(0, 100 - penalty), raw };
}

// ————————————————————— seo —————————————————————

function scoreSeo(m: Measurement): { score: number; raw: RawFinding[] } {
  const seo = m.seo;
  const raw: RawFinding[] = [];
  let penalty = 0;
  const add = (p: number, f: Omit<RawFinding, "penalty" | "category">) => {
    penalty += p;
    raw.push({ ...f, category: "seo", penalty: p });
  };

  // The page asks search engines to stay away — usually a leftover from
  // development, and it silently erases the site from Google/Yandex.
  if (seo.noindex) {
    add(60, { id: "noindex", severity: "critical", titleKey: key("noindex", "title"), detailKey: key("noindex", "detail") });
  }
  if (!seo.title || seo.titleLength < 10 || seo.titleLength > 70) {
    add(20, { id: "bad-title", severity: "major", titleKey: key("bad-title", "title"), detailKey: key("bad-title", "detail"), values: { length: seo.titleLength } });
  }
  if (!seo.metaDescription || seo.metaDescriptionLength < 50 || seo.metaDescriptionLength > 160) {
    add(15, { id: "bad-meta-description", severity: "minor", titleKey: key("bad-meta-description", "title"), detailKey: key("bad-meta-description", "detail"), values: { length: seo.metaDescriptionLength } });
  }
  if (seo.h1Count !== 1) {
    add(10, { id: "h1-count", severity: "minor", titleKey: key("h1-count", "title"), detailKey: key("h1-count", "detail"), values: { count: seo.h1Count } });
  }
  if (seo.imagesWithoutAlt > 0) {
    add(10, { id: "images-without-alt", severity: "minor", titleKey: key("images-without-alt", "title"), detailKey: key("images-without-alt", "detail"), values: { count: seo.imagesWithoutAlt } });
  }
  if (!seo.hasOpenGraph) {
    add(5, { id: "no-open-graph", severity: "minor", titleKey: key("no-open-graph", "title"), detailKey: key("no-open-graph", "detail") });
  }
  if (!seo.langAttribute) {
    add(5, { id: "no-lang", severity: "minor", titleKey: key("no-lang", "title"), detailKey: key("no-lang", "detail") });
  }
  if (!seo.robotsTxtFound) {
    add(5, { id: "no-robots", severity: "minor", titleKey: key("no-robots", "title"), detailKey: key("no-robots", "detail") });
  }
  if (!seo.hasStructuredData) {
    add(5, { id: "no-structured-data", severity: "minor", titleKey: key("no-structured-data", "title"), detailKey: key("no-structured-data", "detail") });
  }
  return { score: Math.max(0, 100 - penalty), raw };
}

// ————————————————————— aggregate —————————————————————

const SEVERITY_RANK: Record<Severity, number> = { critical: 0, major: 1, minor: 2 };

function gradeOf(total: number): Grade {
  if (total >= 90) return "A";
  if (total >= 75) return "B";
  if (total >= 60) return "C";
  if (total >= 40) return "D";
  return "F";
}

export function scoreMeasurement(m: Measurement, now: Date = new Date()): AuditScore {
  const parts: Record<ScoreCategory, { score: number; raw: RawFinding[] }> = {
    speed: scoreSpeed(m),
    conversion: scoreConversion(m, now),
    mobile: scoreMobile(m),
    seo: scoreSeo(m),
    security: scoreSecurity(m),
  };

  const categories = {} as Record<ScoreCategory, CategoryScore>;
  let total = 0;
  for (const cat of CATEGORY_ORDER) {
    const weight = WEIGHTS[cat];
    const score = parts[cat].score;
    const points = (score / 100) * weight;
    categories[cat] = { score, weight, points: Math.round(points * 10) / 10 };
    total += points;
  }

  // Impact of each finding in TOTAL points: category penalty × weight / 100.
  const findings: Finding[] = Object.values(parts)
    .flatMap((p) => p.raw)
    .map(({ penalty, ...f }) => ({
      ...f,
      impact: Math.round(((penalty * WEIGHTS[f.category]) / 100) * 10) / 10,
    }))
    // Impact first; ties (incl. informational 0-impact causes) by severity.
    .sort((a, b) => b.impact - a.impact || SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity]);

  const roundedTotal = Math.round(total);
  return { version: SCORE_VERSION, total: roundedTotal, categories, findings, grade: gradeOf(roundedTotal) };
}
