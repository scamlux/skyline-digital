import "server-only";
import type { Browser, HTTPRequest, HTTPResponse, Page } from "puppeteer-core";
import { launchBrowser } from "@/lib/browser";
import {
  AUDIT_USER_AGENT,
  GuardError,
  createRequestGuard,
  hostKey,
  normalizeUrl,
  type RequestGuard,
  type Resolver,
} from "./guard";
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
 * Engine 2 (ADR 0009):
 * - The SSRF guard runs inside the browser on EVERY request (navigation, each
 *   redirect hop, subresources) via request interception, instead of a
 *   node-side redirect pre-fetch that cost 5–20 s and failed on bot-protected
 *   sites.
 * - Navigation waits for DOMContentLoaded, then softly for `load` within the
 *   budget. A page whose `load` never fires is MEASURED and flagged
 *   `loadTimedOut` — a slow site is the most important finding, not an error.
 *
 * Never throws on an unreachable/hostile target — returns `reachable: false`
 * with an {@link AuditErrorCode}. Throws only on real programming errors.
 */

export const ENGINE_VERSION = "2.0.0";

const MOBILE_VIEWPORT = { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true } as const;
const MOBILE_UA =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 " +
  "(KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";
const MAX_BYTES = 10 * 1024 * 1024; // 10 MB

/** Whole-measurement budget when the caller doesn't set one (fast path). */
const DEFAULT_BUDGET_MS = 25_000;
/** DOMContentLoaded must arrive within this, else the page is read as-is. */
const DCL_TIMEOUT_MS = 15_000;
/** Extra wait for `load` after DOMContentLoaded; beyond it → `loadTimedOut`. */
const LOAD_SOFT_MS = 8_000;
/** Budget kept in reserve for DOM extraction, probes and the screenshot. */
const RESERVE_MS = 4_000;
/** Let LCP settle after the page is ready. */
const SETTLE_MS = 600;
const DNS_RETRY_DELAY_MS = 1_000;
/** Mobile profile (ADR 0009): CPU slowdown and a "fast 4G"-like network. */
const CPU_SLOWDOWN = 4;
const MOBILE_4G = {
  download: (9 * 1024 * 1024) / 8, // ~9 Mbit/s in bytes/s
  upload: (2 * 1024 * 1024) / 8,
  latency: 120, // ms RTT
} as const;

export interface MeasureOptions {
  /** Capture the 390×844 screenshot (needed for the report, skipped on the fast path). */
  screenshot?: boolean;
  /** Overall budget in ms (fast path ~25 s, report ~45 s). */
  budgetMs?: number;
  /** Mobile CPU/network throttling (default on). Off only in unit tests. */
  throttle?: boolean;
  /** @internal Test seam: DNS resolver override. */
  resolver?: Resolver;
  /**
   * @internal Test seam only: exact origins exempt from the SSRF guard, so the
   * loopback fixture can be measured (the real guard rightly blocks it).
   * Production never sets this.
   */
  allowOrigins?: string[];
}

/** Metrics extracted inside the page (DOM, timings, LCP). */
interface DomMetrics {
  navTiming: { ttfb: number | null; domContentLoaded: number | null; load: number | null };
  lcp: number | null;
  cls: number;
  tbt: number;
  renderBlocking: number;
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
  /** Hostname of the main document (after redirects) — "same host" for caching. */
  mainHost: string | null;
  uncompressedText: number;
  legacyImageBytes: number;
  uncachedStatic: number;
}

/** Minimal shapes of the CDP events we consume (puppeteer types them loosely). */
interface CdpResponseReceived {
  requestId: string;
  type: string;
  response?: {
    url?: string;
    status?: number;
    mimeType?: string;
    headers?: Record<string, unknown>;
    securityDetails?: { validTo?: number };
  };
}
interface CdpLoadingFinished {
  requestId: string;
  encodedDataLength?: number;
}

/** What request interception saw: blocked count + a blocked main navigation. */
interface InterceptState {
  blocked: number;
  mainNavigation: GuardError | null;
}

function unreachable(url: string, error: AuditErrorCode, status: number | null = null): Measurement {
  return {
    engineVersion: ENGINE_VERSION,
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

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function measureSite(rawUrl: string, opts: MeasureOptions = {}): Promise<Measurement> {
  let normalized: string;
  try {
    normalized = normalizeUrl(rawUrl);
  } catch {
    return unreachable(rawUrl, "INVALID_URL");
  }

  const guard = createRequestGuard({ resolver: opts.resolver, allowOrigins: opts.allowOrigins });

  // 1. Guard the entry URL before a browser exists. Redirect hops and
  //    subresources are guarded later, by request interception.
  try {
    await guardWithRetry(guard, normalized);
  } catch (err) {
    if (err instanceof GuardError) return unreachable(normalized, err.code);
    return unreachable(normalized, "DNS_FAILED");
  }

  let browser: Browser | null = null;
  try {
    browser = await launchBrowser();
  } catch {
    return unreachable(normalized, "BROWSER_FAILED");
  }

  const budget = opts.budgetMs ?? DEFAULT_BUDGET_MS;
  try {
    return await withHardTimeout(
      runMeasurement(browser, normalized, guard, opts, budget),
      budget,
      () => unreachable(normalized, "TIMEOUT"),
    );
  } catch (err) {
    if (err instanceof GuardError) return unreachable(normalized, err.code);
    const name = err instanceof Error ? err.name : "";
    if (name === "TimeoutError") return unreachable(normalized, "TIMEOUT");
    return unreachable(normalized, "BROWSER_FAILED");
  } finally {
    await browser.close().catch(() => {});
  }
}

/** One retry on a transient DNS failure (the guard doesn't cache failures). */
async function guardWithRetry(guard: RequestGuard, url: string): Promise<void> {
  try {
    await guard(url);
  } catch (err) {
    if (err instanceof GuardError && err.code === "DNS_FAILED") {
      await sleep(DNS_RETRY_DELAY_MS);
      await guard(url);
      return;
    }
    throw err;
  }
}

/**
 * Request-interception handler. EVERY request must end in continue() or
 * abort(), otherwise the page hangs — hence the resolution checks.
 */
async function interceptRequest(
  req: HTTPRequest,
  page: Page,
  guard: RequestGuard,
  state: InterceptState,
): Promise<void> {
  if (req.isInterceptResolutionHandled()) return;
  const url = req.url();
  if (url.startsWith("data:") || url.startsWith("blob:")) {
    await req.continue().catch(() => {});
    return;
  }
  try {
    await guard(url);
    if (!req.isInterceptResolutionHandled()) await req.continue();
  } catch (err) {
    const code = err instanceof GuardError ? err.code : "BLOCKED_ADDRESS";
    if (code !== "DNS_FAILED") state.blocked += 1;
    if (req.isNavigationRequest() && req.frame() === page.mainFrame()) {
      state.mainNavigation = err instanceof GuardError ? err : new GuardError("BLOCKED_ADDRESS", url);
    }
    if (!req.isInterceptResolutionHandled()) {
      await req.abort(code === "DNS_FAILED" ? "namenotresolved" : "blockedbyclient").catch(() => {});
    }
  }
}

/** Chrome navigation error text → our error code. */
function classifyNavError(err: unknown): AuditErrorCode {
  const msg = err instanceof Error ? err.message : String(err);
  if (/ERR_NAME_NOT_RESOLVED|ERR_NAME_RESOLUTION_FAILED/.test(msg)) return "DNS_FAILED";
  if (/ERR_BLOCKED_BY_CLIENT/.test(msg)) return "BLOCKED_ADDRESS";
  return "HTTP_ERROR";
}

async function runMeasurement(
  browser: Browser,
  normalized: string,
  guard: RequestGuard,
  opts: MeasureOptions,
  budget: number,
): Promise<Measurement> {
  const started = Date.now();
  const left = () => budget - (Date.now() - started);

  const page = await browser.newPage();
  await page.emulate({ viewport: MOBILE_VIEWPORT, userAgent: MOBILE_UA });
  // Service-worker fetches bypass request interception — and the SSRF guard.
  await page.setBypassServiceWorker(true);
  const intercept: InterceptState = { blocked: 0, mainNavigation: null };
  await page.setRequestInterception(true);
  page.on("request", (req) => {
    void interceptRequest(req, page, guard, intercept);
  });

  const net = await trackNetwork(page);
  await page.evaluateOnNewDocument(LCP_OBSERVER);

  // A real mid-range phone on mobile internet: CPU ×4 slower, ~4G network.
  // Without it LCP was measured on a laptop core and fibre — far too kind.
  const throttled = opts.throttle !== false;
  if (throttled) {
    await page.emulateCPUThrottling(CPU_SLOWDOWN);
    await page.emulateNetworkConditions(MOBILE_4G);
  }

  let response: HTTPResponse | null = null;
  let dclTimedOut = false;
  try {
    response = await page.goto(normalized, {
      waitUntil: "domcontentloaded",
      timeout: Math.max(1_000, Math.min(DCL_TIMEOUT_MS, left() - RESERVE_MS)),
    });
  } catch (err) {
    if (intercept.mainNavigation) return unreachable(normalized, intercept.mainNavigation.code);
    if (net.exceededLimit) return unreachable(normalized, "TOO_LARGE");
    const name = err instanceof Error ? err.name : "";
    if (name !== "TimeoutError") return unreachable(normalized, classifyNavError(err));
    // DOMContentLoaded never came — read whatever has rendered so far.
    dclTimedOut = true;
  }
  if (intercept.mainNavigation) return unreachable(normalized, intercept.mainNavigation.code);
  if (net.exceededLimit) return unreachable(normalized, "TOO_LARGE");

  const status = response?.status() ?? net.mainStatus;
  if (status != null && status >= 400) {
    const m = unreachable(normalized, "HTTP_ERROR", status);
    m.finalUrl = page.url() || normalized;
    return m;
  }
  if (dclTimedOut && net.mainStatus === null) return unreachable(normalized, "TIMEOUT");

  const actualFinal = page.url() || normalized;
  // Side probes run while the page finishes loading.
  const probes = Promise.all([checksHttpRedirect(actualFinal, guard), checkRobotsSitemap(actualFinal, guard)]);

  // Soft wait for `load`: a page past the budget is measured, not discarded.
  let loadTimedOut = dclTimedOut;
  if (!dclTimedOut) {
    const wait = Math.min(LOAD_SOFT_MS, left() - RESERVE_MS);
    if (wait <= 0) {
      loadTimedOut = true;
    } else {
      try {
        await page.waitForFunction("document.readyState === 'complete'", { timeout: wait, polling: 200 });
      } catch {
        loadTimedOut = true;
      }
    }
  }
  if (net.exceededLimit) return unreachable(normalized, "TOO_LARGE");
  await sleep(Math.min(SETTLE_MS, Math.max(0, left() - RESERVE_MS)));

  // EXTRACT_DOM is a function-as-string; wrap in an IIFE so evaluate() runs it.
  const dom = (await page.evaluate(`(${EXTRACT_DOM})()`)) as DomMetrics;
  const isHttps = new URL(actualFinal).protocol === "https:";

  let screenshotMobile: string | null = null;
  if (opts.screenshot !== false) {
    const shot = await page.screenshot({ type: "png" });
    const b64 = typeof shot === "string" ? shot : Buffer.from(shot).toString("base64");
    screenshotMobile = `data:image/png;base64,${b64}`;
  }

  const [httpRedirectsToHttps, { robotsTxtFound, sitemapFound }] = await probes;

  const speed: SpeedMetrics = {
    ttfb: dom.navTiming.ttfb,
    lcp: dom.lcp,
    domContentLoaded: dom.navTiming.domContentLoaded || null,
    load: loadTimedOut ? null : dom.navTiming.load || null,
    pageWeightBytes: net.pageWeightBytes,
    requestCount: net.requestCount,
    imageBytes: net.imageBytes,
    jsBytes: net.jsBytes,
    cssBytes: net.cssBytes,
    loadTimedOut,
    throttled,
    cls: dom.cls,
    tbt: dom.tbt,
    renderBlocking: dom.renderBlocking,
    uncompressedText: net.uncompressedText,
    legacyImageBytes: net.legacyImageBytes,
    uncachedStatic: net.uncachedStatic,
  };
  const xRobots = (net.mainHeaders["x-robots-tag"] ?? "").toLowerCase();

  const security: SecurityMetrics = {
    https: isHttps,
    httpRedirectsToHttps,
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

  const measurement: Measurement = {
    engineVersion: ENGINE_VERSION,
    blockedRequests: intercept.blocked,
    url: normalized,
    finalUrl: actualFinal,
    host: hostKey(actualFinal),
    fetchedAt: new Date().toISOString(),
    reachable: true,
    httpStatus: status,
    speed,
    mobile: { ...dom.mobile, screenshotMobile },
    security,
    seo: {
      ...dom.seo,
      robotsTxtFound,
      sitemapFound,
      noindex: Boolean(dom.seo.noindex) || /noindex|none/.test(xRobots),
    },
    business: {
      hasContactForm: dom.business.hasContactForm,
      hasPhoneLink: dom.business.hasPhoneLink,
      hasMessengerLink: dom.business.hasMessengerLink,
      hasAnalytics: dom.business.hasAnalytics,
      copyrightYear: dom.business.copyrightYear,
      detectedCms: detectCms(dom.business, net.mainHeaders),
      ctaAboveFold: dom.business.ctaAboveFold,
      hasPrivacyPolicy: dom.business.hasPrivacyPolicy,
    },
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
    mainHost: null,
    uncompressedText: 0,
    legacyImageBytes: 0,
    uncachedStatic: 0,
  };
  const types = new Map<string, string>();
  /** Per-request facts needed once the body size is known. */
  const meta = new Map<string, { encoded: boolean; mime: string; cacheable: boolean; sameHost: boolean }>();
  const cdp = await page.createCDPSession();
  await cdp.send("Network.enable");

  cdp.on("Network.responseReceived", (raw) => {
    const e = raw as unknown as CdpResponseReceived;
    types.set(e.requestId, e.type);
    stats.requestCount += 1;
    const url = e.response?.url ?? "";
    if (url.startsWith("http://")) stats.mixedContent = true;
    const h: Record<string, string> = {};
    for (const [k, v] of Object.entries(e.response?.headers ?? {})) h[k.toLowerCase()] = String(v);
    const cc = h["cache-control"] ?? "";
    const maxAge = Number(cc.match(/max-age=(\d+)/)?.[1] ?? 0);
    let sameHost = false;
    try {
      sameHost = stats.mainHost !== null && new URL(url).hostname === stats.mainHost;
    } catch {
      /* data: and friends */
    }
    meta.set(e.requestId, {
      encoded: /gzip|br|zstd|deflate/i.test(h["content-encoding"] ?? ""),
      mime: (e.response?.mimeType ?? h["content-type"] ?? "").toLowerCase(),
      cacheable: (maxAge > 0 && !/no-store|no-cache/.test(cc)) || Boolean(h["expires"]) || Boolean(h["etag"] && maxAge > 0),
      sameHost,
    });
    if (e.type === "Document" && stats.mainHost === null) {
      try {
        stats.mainHost = new URL(url).hostname;
      } catch {
        /* ignore */
      }
    }
    if (e.type === "Document" && stats.mainStatus === null) {
      stats.mainStatus = e.response?.status ?? null;
      const headers = e.response?.headers ?? {};
      for (const [k, v] of Object.entries(headers)) stats.mainHeaders[k.toLowerCase()] = String(v);
      const validTo = e.response?.securityDetails?.validTo;
      if (typeof validTo === "number") stats.certValidToSec = validTo;
    }
  });
  cdp.on("Network.loadingFinished", (raw) => {
    const e = raw as unknown as CdpLoadingFinished;
    const bytes = e.encodedDataLength ?? 0;
    stats.pageWeightBytes += bytes;
    const t = types.get(e.requestId);
    if (t === "Image" || t === "Media") stats.imageBytes += bytes;
    else if (t === "Script") stats.jsBytes += bytes;
    else if (t === "Stylesheet") stats.cssBytes += bytes;
    if (stats.pageWeightBytes > MAX_BYTES) stats.exceededLimit = true;

    const m = meta.get(e.requestId);
    if (!m) return;
    if ((t === "Document" || t === "Script" || t === "Stylesheet") && !m.encoded && bytes > 1400) {
      stats.uncompressedText += 1;
    }
    if (t === "Image" && /image\/(jpe?g|png|gif)/.test(m.mime)) stats.legacyImageBytes += bytes;
    if (m.sameHost && !m.cacheable && (t === "Script" || t === "Stylesheet" || t === "Image" || t === "Font")) {
      stats.uncachedStatic += 1;
    }
  });
  return stats;
}

// ————————————————————— extra probes —————————————————————

// Node-side probes hit the target directly, so they go through the same guard.

async function checksHttpRedirect(finalUrl: string, guard: RequestGuard): Promise<boolean> {
  try {
    const host = new URL(finalUrl).host;
    const probeUrl = `http://${host}/`;
    await guard(probeUrl);
    const res = await fetch(probeUrl, {
      method: "HEAD",
      redirect: "manual",
      signal: AbortSignal.timeout(4000),
      headers: { "user-agent": AUDIT_USER_AGENT },
    }).catch(() => null);
    if (!res) return false;
    const loc = res.headers.get("location") ?? "";
    return res.status >= 300 && res.status < 400 && loc.startsWith("https:");
  } catch {
    return false;
  }
}

async function checkRobotsSitemap(
  finalUrl: string,
  guard: RequestGuard,
): Promise<{ robotsTxtFound: boolean; sitemapFound: boolean }> {
  const origin = new URL(finalUrl).origin;
  const probe = async (path: string) => {
    try {
      await guard(`${origin}${path}`);
      // Manual redirect: a robots.txt that 302s elsewhere is not followed blindly.
      const res = await fetch(`${origin}${path}`, {
        redirect: "manual",
        signal: AbortSignal.timeout(4000),
        headers: { "user-agent": AUDIT_USER_AGENT },
      }).catch(() => null);
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
  window.__cls = 0;
  window.__tbt = 0;
  try {
    new PerformanceObserver((list) => {
      for (const e of list.getEntries()) window.__lcp = Math.round(e.startTime);
    }).observe({ type: 'largest-contentful-paint', buffered: true });
  } catch (e) {}
  // CLS: largest session window (gap < 1 s, window < 5 s), ignoring shifts
  // right after user input — the same definition Chrome uses.
  try {
    let cur = 0, first = 0, last = 0;
    new PerformanceObserver((list) => {
      for (const e of list.getEntries()) {
        if (e.hadRecentInput) continue;
        if (cur && e.startTime - last < 1000 && e.startTime - first < 5000) {
          cur += e.value;
        } else {
          cur = e.value;
          first = e.startTime;
        }
        last = e.startTime;
        if (cur > window.__cls) window.__cls = cur;
      }
    }).observe({ type: 'layout-shift', buffered: true });
  } catch (e) {}
  // Approximate TBT: blocking part of every long task (> 50 ms).
  try {
    new PerformanceObserver((list) => {
      for (const e of list.getEntries()) window.__tbt += Math.max(0, e.duration - 50);
    }).observe({ type: 'longtask', buffered: true });
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
  // A messenger LINK the visitor can tap — not the word "telegram" in some text.
  const messengerSel = 'a[href*="t.me/"], a[href*="telegram.me/"], a[href^="tg:"], a[href*="wa.me/"], a[href*="api.whatsapp.com"], a[href^="whatsapp:"], a[href^="viber:"]';
  const hasMessengerLink = !!document.querySelector(messengerSel);
  // Any analytics or pixel — incl. privacy-first ones (Vercel, Plausible, Umami,
  // Matomo) that were reported as "no analytics" before.
  const hasAnalytics = /gtag\\(|google-analytics|googletagmanager|mc\\.yandex\\.ru|metrika|fbq\\(|connect\\.facebook\\.net|_vercel\\/insights|va\\.vercel-scripts|vercel\\/analytics|plausible\\.io|umami|matomo|clarity\\.ms|hotjar/i.test(html)
    || performance.getEntriesByType('resource').some((r) => /\\/_vercel\\/insights|google-analytics|googletagmanager|mc\\.yandex|plausible|umami|matomo|clarity\\.ms/i.test(r.name));

  // Is a way to act visible WITHOUT scrolling on the phone screen?
  const ctaWords = /запис|заказ|позвон|звон|оставить заявку|заявк|купить|корзин|забронир|связат|book|order|call|contact|buy|yozil|buyurtma|qo.ng.iroq|bog.lan|aloqa/i;
  const actionables = Array.from(document.querySelectorAll('a[href], button, input[type=submit], [role=button]'));
  const ctaAboveFold = actionables.some((el) => {
    const r = el.getBoundingClientRect();
    if (r.width <= 0 || r.height <= 0 || r.top >= window.innerHeight || r.bottom <= 0) return false;
    const st = getComputedStyle(el);
    if (st.visibility === 'hidden' || st.display === 'none' || Number(st.opacity) === 0) return false;
    const href = el.getAttribute('href') || '';
    if (/^tel:|^tg:|^whatsapp:|t\\.me\\/|wa\\.me\\//i.test(href)) return true;
    const label = ((el.textContent || '') + ' ' + (el.getAttribute('aria-label') || '') + ' ' + (el.getAttribute('value') || '')).slice(0, 120);
    return ctaWords.test(label);
  });

  const hasPrivacyPolicy = Array.from(document.querySelectorAll('a[href]')).some((a) => {
    const t = ((a.textContent || '') + ' ' + (a.getAttribute('href') || '')).toLowerCase();
    return /privacy|конфиденциальн|персональн|policy|maxfiylik|shaxsiy ma/.test(t);
  });

  const robotsMeta = Array.from(document.querySelectorAll('meta[name="robots"], meta[name="googlebot"]'))
    .map((m) => (m.getAttribute('content') || '').toLowerCase()).join(',');
  const noindexMeta = /noindex|none/.test(robotsMeta);
  const canonicalEl = document.querySelector('link[rel="canonical"]');
  const canonical = canonicalEl ? canonicalEl.href || null : null;

  // Render-blocking: classic scripts and stylesheets in <head>.
  const renderBlocking =
    Array.from(document.head ? document.head.querySelectorAll('script[src]') : [])
      .filter((s) => !s.async && !s.defer && s.type !== 'module').length +
    Array.from(document.head ? document.head.querySelectorAll('link[rel="stylesheet"]') : [])
      .filter((l) => !l.media || l.media === 'all' || l.media === 'screen').length;

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
    cls: Math.round((window.__cls || 0) * 1000) / 1000,
    tbt: Math.round(window.__tbt || 0),
    renderBlocking,
    mobile: { hasViewportMeta, horizontalOverflow, tapTargetsTooSmall, baseFontSizePx },
    seo: {
      title, titleLength: title ? title.length : 0,
      metaDescription, metaDescriptionLength: metaDescription ? metaDescription.length : 0,
      h1Count, hasOpenGraph, hasFavicon,
      robotsTxtFound: false, sitemapFound: false,
      langAttribute, imagesWithoutAlt, hasStructuredData,
      noindex: noindexMeta, canonical,
    },
    business: { hasContactForm, hasPhoneLink, hasMessengerLink, hasAnalytics, copyrightYear, generator, htmlHints, ctaAboveFold, hasPrivacyPolicy },
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
