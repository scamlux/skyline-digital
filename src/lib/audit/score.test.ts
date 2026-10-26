import { describe, it, expect } from "vitest";
import { SCORE_VERSION, scoreMeasurement } from "./score";
import type { Measurement } from "./types";

/** A flawless measurement — every category should score 100. */
function perfect(): Measurement {
  return {
    url: "https://example.uz/",
    finalUrl: "https://example.uz/",
    host: "example.uz",
    fetchedAt: "2026-08-31T00:00:00.000Z",
    reachable: true,
    httpStatus: 200,
    speed: {
      ttfb: 200,
      lcp: 1500,
      domContentLoaded: 800,
      load: 1200,
      pageWeightBytes: 800_000,
      requestCount: 30,
      imageBytes: 300_000,
      jsBytes: 200_000,
      cssBytes: 50_000,
    },
    mobile: {
      hasViewportMeta: true,
      horizontalOverflow: false,
      tapTargetsTooSmall: 0,
      baseFontSizePx: 16,
      screenshotMobile: null,
    },
    security: {
      https: true,
      httpRedirectsToHttps: true,
      certExpiresInDays: 200,
      securityHeaders: { hsts: true, xContentTypeOptions: true, csp: true, xFrameOptions: true },
      mixedContent: false,
    },
    seo: {
      title: "A clear, descriptive page title",
      titleLength: 30,
      metaDescription: "x".repeat(100),
      metaDescriptionLength: 100,
      h1Count: 1,
      hasOpenGraph: true,
      hasFavicon: true,
      robotsTxtFound: true,
      sitemapFound: true,
      langAttribute: "ru",
      imagesWithoutAlt: 0,
      hasStructuredData: true,
    },
    business: {
      hasContactForm: true,
      hasPhoneLink: true,
      hasMessengerLink: true,
      hasAnalytics: true,
      detectedCms: "unknown",
      copyrightYear: 2026,
    },
  };
}

const NOW = new Date("2026-10-26T00:00:00Z");
const score = (m: Measurement) => scoreMeasurement(m, NOW);

describe("scoreMeasurement v2 — perfect site", () => {
  it("scores 100 / grade A with no findings, five categories, version 2.0", () => {
    const s = score(perfect());
    expect(s.version).toBe(SCORE_VERSION);
    expect(s.total).toBe(100);
    expect(s.grade).toBe("A");
    expect(s.findings).toHaveLength(0);
    expect(Object.keys(s.categories).sort()).toEqual(["conversion", "mobile", "security", "seo", "speed"]);
    const weights = Object.values(s.categories).reduce((a, c) => a + c.weight, 0);
    expect(weights).toBe(100);
  });

  it("still scores an engine-1 measurement (no CLS/TBT/conversion fields)", () => {
    const m = perfect(); // fixture has no v2 fields at all
    expect(m.speed.cls).toBeUndefined();
    expect(score(m).categories.speed.score).toBe(100);
  });
});

describe("speed (mobile profile, renormalised mix)", () => {
  it("poor LCP produces a critical lcp-slow and drops speed", () => {
    const m = perfect();
    m.speed.lcp = 6000;
    const s = score(m);
    expect(s.categories.speed.score).toBeLessThan(80);
    expect(s.findings.find((f) => f.id === "lcp-slow")?.severity).toBe("critical");
  });

  it("acceptable LCP is a major, not critical, lcp-slow", () => {
    const m = perfect();
    m.speed.lcp = 3200;
    expect(score(m).findings.find((f) => f.id === "lcp-slow")?.severity).toBe("major");
  });

  it("counts CLS and TBT when the engine measured them", () => {
    const m = perfect();
    m.speed.cls = 0.4;
    m.speed.tbt = 900;
    const ids = score(m).findings.map((f) => f.id);
    expect(ids).toContain("layout-shift");
    expect(ids).toContain("main-thread-blocked");
  });

  it("a page whose load never finished caps speed at 25 with a top critical finding", () => {
    const m = perfect();
    m.speed.loadTimedOut = true;
    const s = score(m);
    expect(s.categories.speed.score).toBe(25);
    expect(s.findings[0].id).toBe("load-timeout");
    expect(s.findings[0].severity).toBe("critical");
  });

  it("names fixable causes without extra penalty", () => {
    const m = perfect();
    m.speed.legacyImageBytes = 2_000_000;
    m.speed.uncompressedText = 3;
    const s = score(m);
    expect(s.total).toBe(100);
    const legacy = s.findings.find((f) => f.id === "legacy-images");
    expect(legacy?.impact).toBe(0);
    expect(legacy?.values?.mb).toBe("2.0");
  });
});

describe("conversion", () => {
  it("no way to contact the business is critical and costs a big share of the total", () => {
    const m = perfect();
    m.business.hasContactForm = false;
    m.business.hasPhoneLink = false;
    m.business.hasMessengerLink = false;
    const s = score(m);
    const f = s.findings.find((x) => x.id === "no-contact-action")!;
    expect(f.severity).toBe("critical");
    expect(f.impact).toBeGreaterThanOrEqual(13);
    expect(s.grade).not.toBe("A");
  });

  it("flags missing tel: link, analytics, CTA below the fold and a stale year", () => {
    const m = perfect();
    m.business.hasPhoneLink = false;
    m.business.hasAnalytics = false;
    m.business.ctaAboveFold = false;
    m.business.copyrightYear = 2021;
    const ids = score(m).findings.map((f) => f.id);
    expect(ids).toEqual(expect.arrayContaining(["no-phone-link", "no-analytics", "no-cta-above-fold", "stale-copyright"]));
  });

  it("does not punish an unknown (engine-1) CTA position", () => {
    const m = perfect();
    expect(m.business.ctaAboveFold).toBeUndefined();
    expect(score(m).findings.map((f) => f.id)).not.toContain("no-cta-above-fold");
  });
});

describe("seo — noindex", () => {
  it("noindex is critical and the top SEO finding", () => {
    const m = perfect();
    m.seo.noindex = true;
    const s = score(m);
    const f = s.findings.find((x) => x.id === "noindex");
    expect(f?.severity).toBe("critical");
    expect(s.categories.seo.score).toBe(40);
  });
});

describe("security — demoted", () => {
  it("missing security headers barely move the total", () => {
    const m = perfect();
    m.security.securityHeaders = { hsts: false, xContentTypeOptions: false, csp: false, xFrameOptions: false };
    const s = score(m);
    expect(s.findings.find((f) => f.id === "missing-security-headers")?.impact).toBeLessThanOrEqual(1.2);
    expect(s.grade).toBe("A");
  });

  it("no https is still critical", () => {
    const m = perfect();
    m.security.https = false;
    m.security.httpRedirectsToHttps = false;
    expect(score(m).findings.find((f) => f.id === "no-https")?.severity).toBe("critical");
  });
});

describe("ordering and grades", () => {
  it("findings are sorted by impact desc, ties by severity", () => {
    const m = perfect();
    m.mobile.hasViewportMeta = false;
    m.business.hasAnalytics = false;
    m.speed.uncompressedText = 2;
    const f = score(m).findings;
    for (let i = 1; i < f.length; i++) expect(f[i - 1].impact).toBeGreaterThanOrEqual(f[i].impact);
    expect(f.at(-1)?.id).toBe("no-compression");
  });

  it("a broken site lands on F", () => {
    const m = perfect();
    m.speed = { ...m.speed, lcp: 9000, ttfb: 4000, pageWeightBytes: 9_000_000, requestCount: 250, cls: 0.5, tbt: 2000, loadTimedOut: true };
    m.mobile = { ...m.mobile, hasViewportMeta: false, horizontalOverflow: true, tapTargetsTooSmall: 40, baseFontSizePx: 11 };
    m.security = { ...m.security, https: false, httpRedirectsToHttps: false };
    m.seo = { ...m.seo, title: null, titleLength: 0, metaDescription: null, metaDescriptionLength: 0, h1Count: 0, noindex: true };
    m.business = { ...m.business, hasContactForm: false, hasPhoneLink: false, hasMessengerLink: false, hasAnalytics: false };
    expect(score(m).grade).toBe("F");
  });
});
