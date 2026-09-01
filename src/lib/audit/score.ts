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
 * Deterministic, side-effect-free scorer — docs/TZ-AUDIT-ENGINE.md §5.
 *
 * Each category is scored 0–100 on its own, then weighted (speed 35, mobile 25,
 * security 20, seo 20) into the total. Findings carry their impact in TOTAL
 * points so the top-N are genuinely the most damaging. No user-facing text —
 * only i18n keys.
 *
 * An unreachable measurement gets no score (the UI shows a distinct state); do
 * not call this for `reachable: false`.
 */

const WEIGHTS: Record<ScoreCategory, number> = {
  speed: 35,
  mobile: 25,
  security: 20,
  seo: 20,
};

export const SPEED_THRESHOLDS = {
  lcp: { excellent: 2500, acceptable: 4000 },
  ttfb: { excellent: 800, acceptable: 1800 },
  pageWeight: { excellent: 1_500_000, acceptable: 3_000_000 },
  requests: { excellent: 50, acceptable: 100 },
} as const;

type Band = "excellent" | "acceptable" | "poor";

/** Lower-is-better metric → band. Null (unmeasured) counts as acceptable. */
function band(value: number | null, t: { excellent: number; acceptable: number }): Band {
  if (value == null) return "acceptable";
  if (value <= t.excellent) return "excellent";
  if (value <= t.acceptable) return "acceptable";
  return "poor";
}

const BAND_SCORE: Record<Band, number> = { excellent: 100, acceptable: 65, poor: 25 };

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

function scoreSpeed(m: Measurement): { score: number; raw: RawFinding[] } {
  const s = m.speed;
  const lcpB = band(s.lcp, SPEED_THRESHOLDS.lcp);
  const ttfbB = band(s.ttfb, SPEED_THRESHOLDS.ttfb);
  const weightB = band(s.pageWeightBytes || null, SPEED_THRESHOLDS.pageWeight);
  const reqB = band(s.requestCount || null, SPEED_THRESHOLDS.requests);

  const score = Math.round(
    0.4 * BAND_SCORE[lcpB] + 0.2 * BAND_SCORE[ttfbB] + 0.2 * BAND_SCORE[weightB] + 0.2 * BAND_SCORE[reqB],
  );

  const raw: RawFinding[] = [];
  if (lcpB !== "excellent" && s.lcp != null) {
    raw.push({
      id: "lcp-slow",
      category: "speed",
      severity: lcpB === "poor" ? "critical" : "major",
      penalty: 0.4 * (100 - BAND_SCORE[lcpB]),
      titleKey: key("lcp-slow", "title"),
      detailKey: key("lcp-slow", "detail"),
      values: { lcp: s.lcp },
    });
  }
  if (ttfbB !== "excellent" && s.ttfb != null) {
    raw.push({
      id: "ttfb-slow",
      category: "speed",
      severity: ttfbB === "poor" ? "major" : "minor",
      penalty: 0.2 * (100 - BAND_SCORE[ttfbB]),
      titleKey: key("ttfb-slow", "title"),
      detailKey: key("ttfb-slow", "detail"),
      values: { ttfb: s.ttfb },
    });
  }
  if (weightB !== "excellent") {
    raw.push({
      id: "page-heavy",
      category: "speed",
      severity: weightB === "poor" ? "major" : "minor",
      penalty: 0.2 * (100 - BAND_SCORE[weightB]),
      titleKey: key("page-heavy", "title"),
      detailKey: key("page-heavy", "detail"),
      values: { mb: (s.pageWeightBytes / 1_000_000).toFixed(1) },
    });
  }
  if (reqB !== "excellent") {
    raw.push({
      id: "too-many-requests",
      category: "speed",
      severity: "minor",
      penalty: 0.2 * (100 - BAND_SCORE[reqB]),
      titleKey: key("too-many-requests", "title"),
      detailKey: key("too-many-requests", "detail"),
      values: { count: s.requestCount },
    });
  }
  return { score, raw };
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
    add(Math.min(20, missing * 5), { id: "missing-security-headers", severity: "minor", titleKey: key("missing-security-headers", "title"), detailKey: key("missing-security-headers", "detail"), values: { count: missing } });
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

function gradeOf(total: number): Grade {
  if (total >= 90) return "A";
  if (total >= 75) return "B";
  if (total >= 60) return "C";
  if (total >= 40) return "D";
  return "F";
}

export function scoreMeasurement(m: Measurement): AuditScore {
  const parts: Record<ScoreCategory, { score: number; raw: RawFinding[] }> = {
    speed: scoreSpeed(m),
    mobile: scoreMobile(m),
    security: scoreSecurity(m),
    seo: scoreSeo(m),
  };

  const categories = {} as Record<ScoreCategory, CategoryScore>;
  let total = 0;
  for (const cat of Object.keys(parts) as ScoreCategory[]) {
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
    .sort((a, b) => b.impact - a.impact);

  const roundedTotal = Math.round(total);
  return { total: roundedTotal, categories, findings, grade: gradeOf(roundedTotal) };
}
