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
  /**
   * engine ≥ 2: the `load` event did not fire within the soft budget. The page
   * WAS measured (from DOMContentLoaded) — this is a "very slow" finding, not
   * an unreachable site. Optional: rows stored by engine 1 lack it.
   */
  loadTimedOut?: boolean;
  // ——— engine ≥ 2 (optional: engine 1 rows lack them) ———
  /** Measured under the mobile throttling profile (CPU ×4, ~4G network). */
  throttled?: boolean;
  /** Cumulative Layout Shift (largest session window), unitless. */
  cls?: number | null;
  /** Approx. Total Blocking Time: Σ (long task − 50 ms), ms. */
  tbt?: number | null;
  /** <script> without async/defer and stylesheets in <head> that block render. */
  renderBlocking?: number;
  /** Text resources (HTML/JS/CSS > 1.4 KB) served without gzip/br/zstd. */
  uncompressedText?: number;
  /** Bytes of JPEG/PNG/GIF images (not WebP/AVIF/SVG). */
  legacyImageBytes?: number;
  /** Same-host static files (JS/CSS/images/fonts) without a cache lifetime. */
  uncachedStatic?: number;
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
  // ——— engine ≥ 2 ———
  /** Page tells search engines not to index it (meta robots or X-Robots-Tag). */
  noindex?: boolean;
  /** Absolute canonical URL, if declared. */
  canonical?: string | null;
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
  // ——— engine ≥ 2 ———
  /** A call/messenger/form/order action is visible on the first mobile screen. */
  ctaAboveFold?: boolean;
  /** Link to a privacy policy / personal-data terms. */
  hasPrivacyPolicy?: boolean;
}

// ————————————————————— Measurement —————————————————————

export interface Measurement {
  /**
   * Measurement contract version (engine 1 rows predate the field). Compare
   * stored audits only within one engine version — thresholds and wait
   * strategy change what the numbers mean.
   */
  engineVersion?: string;
  /** Requests the SSRF guard aborted (private IPs, odd ports/schemes). */
  blockedRequests?: number;
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

/** `conversion` exists from score v2; v1 rows in the DB have only the other four. */
export type ScoreCategory = "speed" | "conversion" | "mobile" | "security" | "seo";
export type Severity = "critical" | "major" | "minor";
export type Grade = "A" | "B" | "C" | "D" | "F";

export interface CategoryScore {
  /** Category quality 0–100, independent of its weight. */
  score: number;
  /** Weight in the total (v2: speed 30, conversion 25, mobile 20, seo 15, security 10). */
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
  /** Scoring rules version — compare totals only within one version. */
  version?: string;
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
    version?: string;
    total: number;
    grade: Grade;
    /** Partial: v1 rows have no `conversion`. */
    categories: Partial<Record<ScoreCategory, CategoryScore>>;
    findings: Finding[];
  };
  /** Shareable report token (report endpoint, when stored). */
  token?: string;
  /** Data-URL PNG — report endpoint only. */
  screenshot?: string | null;
}
