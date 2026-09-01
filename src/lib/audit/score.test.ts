import { describe, it, expect } from "vitest";
import { scoreMeasurement } from "./score";
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

describe("scoreMeasurement — perfect site", () => {
  it("scores 100 / grade A with no findings", () => {
    const s = scoreMeasurement(perfect());
    expect(s.total).toBe(100);
    expect(s.grade).toBe("A");
    expect(s.findings).toHaveLength(0);
    expect(s.categories.speed.score).toBe(100);
    expect(s.categories.mobile.score).toBe(100);
    expect(s.categories.security.score).toBe(100);
    expect(s.categories.seo.score).toBe(100);
  });
});

describe("speed thresholds (mobile profile)", () => {
  const withLcp = (lcp: number) => {
    const m = perfect();
    m.speed.lcp = lcp;
    return scoreMeasurement(m).categories.speed.score;
  };

  it("LCP ≤ 2500 is excellent → full speed", () => {
    expect(withLcp(2500)).toBe(100);
  });
  it("LCP 2501–4000 is acceptable → LCP band 65", () => {
    // 0.4*65 + 0.2*100*3 = 86
    expect(withLcp(2501)).toBe(86);
    expect(withLcp(4000)).toBe(86);
  });
  it("LCP > 4000 is poor → LCP band 25", () => {
    // 0.4*25 + 60 = 70
    expect(withLcp(4001)).toBe(70);
  });

  it("emits lcp-slow critical for a poor LCP", () => {
    const m = perfect();
    m.speed.lcp = 9000;
    const f = scoreMeasurement(m).findings.find((x) => x.id === "lcp-slow");
    expect(f?.severity).toBe("critical");
    expect(f?.values?.lcp).toBe(9000);
  });
});

describe("security — no https dominates", () => {
  it("drops grade to B and surfaces no-https with impact 12", () => {
    const m = perfect();
    m.security.https = false;
    const s = scoreMeasurement(m);
    // security 40/100 → 8 points; total 35+25+8+20 = 88
    expect(s.total).toBe(88);
    expect(s.grade).toBe("B");
    const top = s.findings[0];
    expect(top.id).toBe("no-https");
    expect(top.impact).toBe(12);
  });
});

describe("findings are sorted by impact desc", () => {
  it("no-viewport (12.5) outranks no-https (12)", () => {
    const m = perfect();
    m.security.https = false;
    m.mobile.hasViewportMeta = false;
    const s = scoreMeasurement(m);
    expect(s.findings[0].id).toBe("no-viewport");
    expect(s.findings[0].impact).toBe(12.5);
    expect(s.findings[1].id).toBe("no-https");
  });
});

describe("grade boundaries", () => {
  const gradeFor = (mut: (m: Measurement) => void) => {
    const m = perfect();
    mut(m);
    return scoreMeasurement(m);
  };

  it("a broken site lands on F", () => {
    const s = gradeFor((m) => {
      m.speed.lcp = 12000;
      m.speed.ttfb = 5000;
      m.speed.pageWeightBytes = 8_000_000;
      m.speed.requestCount = 300;
      m.mobile.hasViewportMeta = false;
      m.mobile.horizontalOverflow = true;
      m.security.https = false;
      m.seo.title = null;
      m.seo.metaDescription = null;
      m.seo.h1Count = 0;
      m.seo.imagesWithoutAlt = 12;
      m.seo.hasOpenGraph = false;
      m.seo.langAttribute = null;
      m.seo.robotsTxtFound = false;
      m.seo.hasStructuredData = false;
    });
    expect(s.grade).toBe("F");
    expect(s.total).toBeLessThan(40);
  });
});
