/**
 * Shared types for the audit engine — see docs/TZ-AUDIT-ENGINE.md §4–§5.
 *
 * One measurement shape is produced by `measureSite` and consumed by the
 * scorer, the /audit API, and the radar. No duplication of the metric contract.
 */

export type AuditErrorCode =
  | "INVALID_URL"
  | "BLOCKED_ADDRESS"
  | "DNS_FAILED"
  | "TIMEOUT"
  | "TOO_LARGE"
  | "HTTP_ERROR"
  | "BROWSER_FAILED";

// ————————————————————— A. Speed —————————————————————

export interface SpeedMetrics {
  ttfb: number | null; // ms
  lcp: number | null; // ms, mobile-emulated
  domContentLoaded: number | null; // ms
  load: number | null; // ms
  pageWeightBytes: number;
  requestCount: number;
  imageBytes: number;
  jsBytes: number;
  cssBytes: number;
}

// ————————————————————— B. Mobile —————————————————————

export interface MobileMetrics {
  hasViewportMeta: boolean;
  horizontalOverflow: boolean;
  tapTargetsTooSmall: number;
  baseFontSizePx: number | null;
  /** Base64 PNG (data URL) of the 390×844 viewport. Null on fast path. */
  screenshotMobile: string | null;
}

// ————————————————————— C. Security —————————————————————

export interface SecurityHeaders {
  hsts: boolean; // strict-transport-security
  xContentTypeOptions: boolean;
  csp: boolean; // content-security-policy
  xFrameOptions: boolean;
}

export interface SecurityMetrics {
  https: boolean;
  httpRedirectsToHttps: boolean;
  certExpiresInDays: number | null;
  securityHeaders: SecurityHeaders;
  mixedContent: boolean;
}

// ————————————————————— D. SEO —————————————————————

export interface SeoMetrics {
  title: string | null;
  titleLength: number;
  metaDescription: string | null;
  metaDescriptionLength: number;
  h1Count: number;
  hasOpenGraph: boolean;
  hasFavicon: boolean;
  robotsTxtFound: boolean;
  sitemapFound: boolean;
  langAttribute: string | null;
  imagesWithoutAlt: number;
  hasStructuredData: boolean;
}

// ————————————————————— E. Business signals —————————————————————

export type DetectedCms =
  | "WordPress"
  | "Tilda"
  | "Wix"
  | "Bitrix"
  | "Shopify"
  | "unknown";

export interface BusinessSignals {
  hasContactForm: boolean;
  hasPhoneLink: boolean;
  hasMessengerLink: boolean;
  hasAnalytics: boolean;
  detectedCms: DetectedCms;
  copyrightYear: number | null;
}

// ————————————————————— Measurement —————————————————————

export interface Measurement {
  url: string; // normalised
  finalUrl: string; // after redirects
  host: string;
  fetchedAt: string; // ISO
  reachable: boolean;
  httpStatus: number | null;
  /** Present when reachable === false. */
  error?: AuditErrorCode;
  speed: SpeedMetrics;
  mobile: MobileMetrics;
  security: SecurityMetrics;
  seo: SeoMetrics;
  business: BusinessSignals;
}

// ————————————————————— Score —————————————————————

export type ScoreCategory = "speed" | "mobile" | "security" | "seo";
export type Severity = "critical" | "major" | "minor";
export type Grade = "A" | "B" | "C" | "D" | "F";

export interface CategoryScore {
  /** Category quality 0–100, independent of its weight. */
  score: number;
  /** Weight in the total (speed 35, mobile 25, security 20, seo 20). */
  weight: number;
  /** Weighted contribution to the total: score/100 × weight. */
  points: number;
}

export interface Finding {
  id: string; // "lcp-slow", "no-viewport", "no-https"
  category: ScoreCategory;
  severity: Severity;
  /** Points lost by this finding (drives the sort, desc). */
  impact: number;
  /** i18n keys — no user-facing text lives in code. */
  titleKey: string;
  detailKey: string;
  /** Interpolation values for the translation: { lcp: 8400 }. */
  values?: Record<string, string | number>;
}

export interface AuditScore {
  total: number; // 0–100
  categories: Record<ScoreCategory, CategoryScore>;
  findings: Finding[]; // sorted by impact desc
  grade: Grade;
}

/**
 * Shape returned by /api/audit and /api/audit/report and consumed by the page.
 * On an unreachable target `reachable` is false and `error` is set (the UI
 * shows a distinct state, not a zero score). On success `score` is present;
 * the fast endpoint trims `score.findings` to the top 3, the report keeps all
 * findings and adds the mobile `screenshot`.
 */
export interface AuditApiResult {
  reachable: boolean;
  host: string;
  finalUrl: string;
  error?: AuditErrorCode;
  score?: {
    total: number;
    grade: Grade;
    categories: Record<ScoreCategory, CategoryScore>;
    findings: Finding[];
  };
  /** Data-URL PNG — report endpoint only. */
  screenshot?: string | null;
}
