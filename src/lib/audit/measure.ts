import "server-only";
import type { Browser, HTTPResponse, Page } from "puppeteer-core";
import { launchBrowser } from "@/lib/browser";
import { GuardError, guardRedirectChain, hostKey, normalizeUrl } from "./guard";
import type {
  AuditErrorCode,
  BusinessSignals,
  Measurement,
  MobileMetrics,
  SecurityMetrics,
  SeoMetrics,
  SpeedMetrics,
} from "./types";

/**
 * measureSite — the single measurement path used by /audit and the radar
 * (docs/TZ-AUDIT-ENGINE.md §4). No Lighthouse: metrics come from CDP and an
 * in-page PerformanceObserver, under a mobile emulation.
 *
 * Never throws on an unreachable/hostile target — returns `reachable: false`
 * with an {@link AuditErrorCode}. Throws only on real programming errors.
 */

const MOBILE_VIEWPORT = { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true } as const;
const MOBILE_UA =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 " +
  "(KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";
const HARD_TIMEOUT_MS = 20_000;
const NAV_TIMEOUT_MS = 18_000;
const MAX_BYTES = 10 * 1024 * 1024; // 10 MB

export interface MeasureOptions {
  /** Capture the 390×844 screenshot (needed for the report, skipped on the fast path). */
  screenshot?: boolean;
  /**
   * @internal Test seam only. Overrides the SSRF guard + redirect resolution so
   * measurement can be exercised against a loopback fixture (which the real
   * guard rightly blocks). Production always uses the real {@link guardRedirectChain}.
   */
  resolveChain?: typeof guardRedirectChain;
}

/** Metrics extracted inside the page (DOM, timings, LCP). */
interface DomMetrics {
  navTiming: { ttfb: number | null; domContentLoaded: number | null; load: number | null };
  lcp: number | null;
  mobile: Omit<MobileMetrics, "screenshotMobile">;
  seo: SeoMetrics;
  business: Omit<BusinessSignals, "detectedCms"> & { generator: string | null; htmlHints: string[] };
}

interface NetworkStats {
  pageWeightBytes: number;
  requestCount: number;
  imageBytes: number;
  jsBytes: number;
  cssBytes: number;
  mainHeaders: Record<string, string>;
  mainStatus: number | null;
  certValidToSec: number | null;
  mixedContent: boolean;
  exceededLimit: boolean;
}

function unreachable(url: string, error: AuditErrorCode, status: number | null = null): Measurement {
  return {
    url,
    finalUrl: url,
    host: safeHost(url),
    fetchedAt: new Date().toISOString(),
    reachable: false,
    httpStatus: status,
    error,
    speed: emptySpeed(),
    mobile: emptyMobile(),
    security: emptySecurity(),
    seo: emptySeo(),
    business: emptyBusiness(),
  };
}

function safeHost(url: string): string {
  try {
    return hostKey(url);
  } catch {
    return "";
  }
}

export async function measureSite(rawUrl: string, opts: MeasureOptions = {}): Promise<Measurement> {
  let normalized: string;
  try {
    normalized = normalizeUrl(rawUrl);
  } catch {
    return unreachable(rawUrl, "INVALID_URL");
  }

  // 1. Guard + resolve the redirect chain up to 3 hops (re-checking each).
  let finalUrl: string;
  try {
    const chain = await (opts.resolveChain ?? guardRedirectChain)(normalized, {
      signal: AbortSignal.timeout(HARD_TIMEOUT_MS),
    });
    finalUrl = chain.finalUrl;
    if (chain.status >= 400) {
      const m = unreachable(normalized, "HTTP_ERROR", chain.status);
      m.finalUrl = finalUrl;
      return m;
    }
  } catch (err) {
    if (err instanceof GuardError) return unreachable(normalized, err.code);
    // Network failure while probing redirects → treat as unreachable.
    const name = err instanceof Error ? err.name : "";
    return unreachable(normalized, name === "TimeoutError" || name === "AbortError" ? "TIMEOUT" : "DNS_FAILED");
  }

  let browser: Browser | null = null;
  try {
    browser = await launchBrowser();
  } catch {
    return unreachable(finalUrl, "BROWSER_FAILED");
  }

  try {
    return await withHardTimeout(
      runMeasurement(browser, normalized, finalUrl, opts),
      HARD_TIMEOUT_MS,
      () => unreachable(finalUrl, "TIMEOUT"),
    );
  } catch (err) {
    const name = err instanceof Error ? err.name : "";
    if (name === "TimeoutError") return unreachable(finalUrl, "TIMEOUT");
    return unreachable(finalUrl, "BROWSER_FAILED");
  } finally {
    await browser.close().catch(() => {});
  }
}

async function runMeasurement(
  browser: Browser,
  normalized: string,
  finalUrl: string,
  opts: MeasureOptions,
): Promise<Measurement> {
  const page = await browser.newPage();
  await page.emulate({ viewport: MOBILE_VIEWPORT, userAgent: MOBILE_UA });
  page.setDefaultNavigationTimeout(NAV_TIMEOUT_MS);

  const net = await trackNetwork(page);
  await page.evaluateOnNewDocument(LCP_OBSERVER);

  let response: HTTPResponse | null = null;
  try {
    response = await page.goto(finalUrl, { waitUntil: "load" });
  } catch (err) {
    const name = err instanceof Error ? err.name : "";
    if (net.exceededLimit) return unreachable(finalUrl, "TOO_LARGE");
    if (name === "TimeoutError") {
      // Timed out but the page may be partially loaded — still try to read it.
    } else {
      return unreachable(finalUrl, "HTTP_ERROR");
    }
  }
  if (net.exceededLimit) return unreachable(finalUrl, "TOO_LARGE");

  // Let LCP settle briefly after load.
  await new Promise((r) => setTimeout(r, 600));

  // EXTRACT_DOM is a function-as-string; wrap in an IIFE so evaluate() runs it.
  const dom = (await page.evaluate(`(${EXTRACT_DOM})()`)) as DomMetrics;

  const actualFinal = page.url() || finalUrl;
  const status = response?.status() ?? net.mainStatus;
  const isHttps = new URL(actualFinal).protocol === "https:";

  let screenshotMobile: string | null = null;
  if (opts.screenshot !== false) {
    const shot = await page.screenshot({ type: "png" });
    const b64 = typeof shot === "string" ? shot : Buffer.from(shot).toString("base64");
    screenshotMobile = `data:image/png;base64,${b64}`;
  }

  const speed: SpeedMetrics = {
    ttfb: dom.navTiming.ttfb,
    lcp: dom.lcp,
    domContentLoaded: dom.navTiming.domContentLoaded,
    load: dom.navTiming.load,
    pageWeightBytes: net.pageWeightBytes,
    requestCount: net.requestCount,
    imageBytes: net.imageBytes,
    jsBytes: net.jsBytes,
    cssBytes: net.cssBytes,
  };

  const security: SecurityMetrics = {
    https: isHttps,
    httpRedirectsToHttps: await checksHttpRedirect(actualFinal),
    certExpiresInDays: net.certValidToSec
      ? Math.round((net.certValidToSec * 1000 - Date.now()) / 86_400_000)
      : null,
    securityHeaders: {
      hsts: "strict-transport-security" in net.mainHeaders,
      xContentTypeOptions: "x-content-type-options" in net.mainHeaders,
      csp: "content-security-policy" in net.mainHeaders,
      xFrameOptions: "x-frame-options" in net.mainHeaders,
    },
    mixedContent: isHttps && net.mixedContent,
  };

  const { robotsTxtFound, sitemapFound } = await checkRobotsSitemap(actualFinal);

  const measurement: Measurement = {
    url: normalized,
    finalUrl: actualFinal,
    host: hostKey(actualFinal),
    fetchedAt: new Date().toISOString(),
    reachable: true,
    httpStatus: status,
    speed,
    mobile: { ...dom.mobile, screenshotMobile },
    security,
    seo: { ...dom.seo, robotsTxtFound, sitemapFound },
    business: { ...stripHtmlHints(dom.business), detectedCms: detectCms(dom.business, net.mainHeaders) },
  };
  return measurement;
}

// ————————————————————— network (CDP) —————————————————————

async function trackNetwork(page: Page): Promise<NetworkStats> {
  const stats: NetworkStats = {
    pageWeightBytes: 0,
    requestCount: 0,
    imageBytes: 0,
    jsBytes: 0,
    cssBytes: 0,
    mainHeaders: {},
    mainStatus: null,
    certValidToSec: null,
    mixedContent: false,
    exceededLimit: false,
  };
  const types = new Map<string, string>();
  const cdp = await page.createCDPSession();
  await cdp.send("Network.enable");

  cdp.on("Network.responseReceived", (e: any) => {
    types.set(e.requestId, e.type);
    stats.requestCount += 1;
    const url: string = e.response?.url ?? "";
    if (url.startsWith("http://")) stats.mixedContent = true;
    if (e.type === "Document" && stats.mainStatus === null) {
      stats.mainStatus = e.response?.status ?? null;
      const headers = e.response?.headers ?? {};
      for (const [k, v] of Object.entries(headers)) stats.mainHeaders[k.toLowerCase()] = String(v);
      const validTo = e.response?.securityDetails?.validTo;
      if (typeof validTo === "number") stats.certValidToSec = validTo;
    }
  });
  cdp.on("Network.loadingFinished", (e: any) => {
    const bytes: number = e.encodedDataLength ?? 0;
    stats.pageWeightBytes += bytes;
    const t = types.get(e.requestId);
    if (t === "Image" || t === "Media") stats.imageBytes += bytes;
    else if (t === "Script") stats.jsBytes += bytes;
    else if (t === "Stylesheet") stats.cssBytes += bytes;
    if (stats.pageWeightBytes > MAX_BYTES) stats.exceededLimit = true;
  });
  return stats;
}

// ————————————————————— extra probes —————————————————————

async function checksHttpRedirect(finalUrl: string): Promise<boolean> {
  try {
    const host = new URL(finalUrl).host;
    const res = await fetch(`http://${host}/`, {
      method: "HEAD",
      redirect: "manual",
      signal: AbortSignal.timeout(4000),
    }).catch(() => null);
    if (!res) return false;
    const loc = res.headers.get("location") ?? "";
    return res.status >= 300 && res.status < 400 && loc.startsWith("https:");
  } catch {
    return false;
  }
}

async function checkRobotsSitemap(finalUrl: string): Promise<{ robotsTxtFound: boolean; sitemapFound: boolean }> {
  const origin = new URL(finalUrl).origin;
  const probe = async (path: string) => {
    try {
      const res = await fetch(`${origin}${path}`, { signal: AbortSignal.timeout(4000) }).catch(() => null);
      return Boolean(res && res.ok);
    } catch {
      return false;
    }
  };
  const [robotsTxtFound, sitemapFound] = await Promise.all([probe("/robots.txt"), probe("/sitemap.xml")]);
  return { robotsTxtFound, sitemapFound };
}

// ————————————————————— CMS detection (server-side) —————————————————————

function detectCms(
  b: Omit<BusinessSignals, "detectedCms"> & { generator: string | null; htmlHints: string[] },
  headers: Record<string, string>,
): BusinessSignals["detectedCms"] {
  const gen = (b.generator ?? "").toLowerCase();
  const hints = b.htmlHints.join(" ").toLowerCase();
  const powered = (headers["x-powered-by"] ?? "").toLowerCase();
  const hay = `${gen} ${hints} ${powered} ${headers["x-powered-cms"] ?? ""}`.toLowerCase();
  if (hay.includes("wordpress") || hints.includes("wp-content")) return "WordPress";
  if (hay.includes("tilda")) return "Tilda";
  if (hay.includes("wix")) return "Wix";
  if (hay.includes("bitrix")) return "Bitrix";
  if (hay.includes("shopify")) return "Shopify";
  return "unknown";
}

function stripHtmlHints(
  b: Omit<BusinessSignals, "detectedCms"> & { generator: string | null; htmlHints: string[] },
): Omit<BusinessSignals, "detectedCms"> {
  const { generator: _g, htmlHints: _h, ...rest } = b;
  return rest;
}

// ————————————————————— hard timeout —————————————————————

async function withHardTimeout<T>(p: Promise<T>, ms: number, onTimeout: () => T): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<T>((resolve) => {
    timer = setTimeout(() => resolve(onTimeout()), ms);
  });
  try {
    return await Promise.race([p, timeout]);
  } finally {
    clearTimeout(timer!);
  }
}

// ————————————————————— in-page scripts —————————————————————

/** Records the largest-contentful-paint into a global, buffered. */
const LCP_OBSERVER = `
  window.__lcp = null;
  try {
    new PerformanceObserver((list) => {
      for (const e of list.getEntries()) window.__lcp = Math.round(e.startTime);
    }).observe({ type: 'largest-contentful-paint', buffered: true });
  } catch (e) {}
`;

/** Extracts all DOM/timing metrics in one round-trip. Runs in the page. */
const EXTRACT_DOM = `() => {
  const nav = performance.getEntriesByType('navigation')[0];
  const navTiming = nav ? {
    ttfb: Math.round(nav.responseStart),
    domContentLoaded: Math.round(nav.domContentLoadedEventEnd),
    load: Math.round(nav.loadEventEnd),
  } : { ttfb: null, domContentLoaded: null, load: null };

  const viewport = document.querySelector('meta[name="viewport"]');
  const hasViewportMeta = !!viewport && /width\\s*=\\s*device-width/i.test(viewport.getAttribute('content') || '');
  const horizontalOverflow = document.scrollingElement
    ? document.scrollingElement.scrollWidth > window.innerWidth + 4
    : false;

  const clickable = Array.from(document.querySelectorAll('a[href], button, input[type=button], input[type=submit], [role=button]'));
  let tapTargetsTooSmall = 0;
  for (const el of clickable) {
    const r = el.getBoundingClientRect();
    if (r.width > 0 && r.height > 0 && (r.width < 40 || r.height < 40)) tapTargetsTooSmall++;
  }
  const baseFontSizePx = parseFloat(getComputedStyle(document.body).fontSize) || null;

  const title = document.title || null;
  const md = document.querySelector('meta[name="description"]');
  const metaDescription = md ? (md.getAttribute('content') || '') : null;
  const h1Count = document.querySelectorAll('h1').length;
  const hasOpenGraph = !!document.querySelector('meta[property="og:title"]') && !!document.querySelector('meta[property="og:image"]');
  const hasFavicon = !!document.querySelector('link[rel~="icon"]');
  const langAttribute = document.documentElement.getAttribute('lang') || null;
  const imgs = Array.from(document.querySelectorAll('img'));
  const imagesWithoutAlt = imgs.filter((i) => !i.getAttribute('alt')).length;
  const hasStructuredData = !!document.querySelector('script[type="application/ld+json"]');

  const forms = Array.from(document.querySelectorAll('form'));
  const hasContactForm = forms.some((f) => !!f.querySelector('input[type=email], input[type=tel], input[name*=mail i], input[name*=phone i]'));
  const hasPhoneLink = !!document.querySelector('a[href^="tel:"]');
  const html = document.documentElement.outerHTML;
  const hasMessengerLink = /t\\.me\\/|wa\\.me\\/|api\\.whatsapp\\.com|whatsapp|telegram/i.test(html);
  const hasAnalytics = /gtag\\(|google-analytics|googletagmanager|mc\\.yandex\\.ru|metrika|fbq\\(|connect\\.facebook\\.net/i.test(html);

  const gen = document.querySelector('meta[name="generator"]');
  const generator = gen ? (gen.getAttribute('content') || '') : null;
  const htmlHints = [];
  if (/wp-content|wp-includes/i.test(html)) htmlHints.push('wp-content');
  if (/tilda/i.test(html)) htmlHints.push('tilda');
  if (/wix\\.com|_wix/i.test(html)) htmlHints.push('wix');
  if (/bitrix/i.test(html)) htmlHints.push('bitrix');
  if (/cdn\\.shopify|shopify/i.test(html)) htmlHints.push('shopify');

  const footer = document.querySelector('footer');
  const footerText = (footer ? footer.textContent : document.body.textContent) || '';
  const years = (footerText.match(/20\\d{2}/g) || []).map(Number).filter((y) => y >= 2000 && y <= 2100);
  const copyrightYear = years.length ? Math.max(...years) : null;

  return {
    navTiming,
    lcp: window.__lcp,
    mobile: { hasViewportMeta, horizontalOverflow, tapTargetsTooSmall, baseFontSizePx },
    seo: {
      title, titleLength: title ? title.length : 0,
      metaDescription, metaDescriptionLength: metaDescription ? metaDescription.length : 0,
      h1Count, hasOpenGraph, hasFavicon,
      robotsTxtFound: false, sitemapFound: false,
      langAttribute, imagesWithoutAlt, hasStructuredData,
    },
    business: { hasContactForm, hasPhoneLink, hasMessengerLink, hasAnalytics, copyrightYear, generator, htmlHints },
  };
}`;

// ————————————————————— empties —————————————————————

function emptySpeed(): SpeedMetrics {
  return { ttfb: null, lcp: null, domContentLoaded: null, load: null, pageWeightBytes: 0, requestCount: 0, imageBytes: 0, jsBytes: 0, cssBytes: 0 };
}
function emptyMobile(): MobileMetrics {
  return { hasViewportMeta: false, horizontalOverflow: false, tapTargetsTooSmall: 0, baseFontSizePx: null, screenshotMobile: null };
}
function emptySecurity(): SecurityMetrics {
  return { https: false, httpRedirectsToHttps: false, certExpiresInDays: null, securityHeaders: { hsts: false, xContentTypeOptions: false, csp: false, xFrameOptions: false }, mixedContent: false };
}
function emptySeo(): SeoMetrics {
  return { title: null, titleLength: 0, metaDescription: null, metaDescriptionLength: 0, h1Count: 0, hasOpenGraph: false, hasFavicon: false, robotsTxtFound: false, sitemapFound: false, langAttribute: null, imagesWithoutAlt: 0, hasStructuredData: false };
}
function emptyBusiness(): BusinessSignals {
  return { hasContactForm: false, hasPhoneLink: false, hasMessengerLink: false, hasAnalytics: false, detectedCms: "unknown", copyrightYear: null };
}
