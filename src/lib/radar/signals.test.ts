import { describe, it, expect } from "vitest";
import { extractEmails, extractSocials, hasCtaText, hasAnalytics, enrichCompany } from "./signals";
import type { Company } from "./types";

const HTML = `<!doctype html><html><head>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <script>gtag('js', new Date());</script>
  </head><body>
  Пишите: Info@Clinic.uz. <a href="https://instagram.com/clinic">IG</a>
  <a href="https://t.me/clinic_bot">TG</a>
  <button>Записаться на приём</button>
</body></html>`;

const C = (over: Partial<Company> = {}): Company => ({
  name: "Клиника", phone: "+998901234567", industry: "dentistry", city: "Ташкент",
  website: null, email: null, socialLinks: [], source: "yellowpages", sourceUrl: null, geo: null, ...over,
});

describe("signal extraction", () => {
  it("pulls emails, socials, CTA, analytics from HTML", () => {
    expect(extractEmails(HTML)).toContain("info@clinic.uz");
    expect(extractSocials(HTML)).toEqual(
      expect.arrayContaining(["https://instagram.com/clinic", "https://t.me/clinic_bot"]),
    );
    expect(hasCtaText(HTML)).toBe(true);
    expect(hasAnalytics(HTML)).toBe(true);
  });
});

describe("enrichCompany", () => {
  it("no website → no_site, unreachable", async () => {
    const r = await enrichCompany(C());
    expect(r.webStatus).toBe("no_site");
    expect(r.signals.websiteReachable).toBe(false);
  });

  it("reachable https site → ok with parsed signals", async () => {
    const fetchImpl = (async () => {
      const res = new Response(HTML, { status: 200 });
      Object.defineProperty(res, "url", { value: "https://clinic.uz/" });
      return res;
    }) as unknown as typeof fetch;
    const r = await enrichCompany(C({ website: "clinic.uz" }), { fetchImpl });
    expect(r.webStatus).toBe("ok");
    expect(r.signals.websiteReachable).toBe(true);
    expect(r.signals.hasEmail).toBe(true);
    expect(r.signals.hasSocial).toBe(true);
    expect(r.signals.hasCta).toBe(true);
    expect(r.signals.hasAnalytics).toBe(true);
    expect(r.signals.https).toBe(true);
  });

  it("timeout/error never throws", async () => {
    const fetchImpl = (async () => {
      const e = new Error("aborted"); e.name = "AbortError"; throw e;
    }) as unknown as typeof fetch;
    const r = await enrichCompany(C({ website: "clinic.uz" }), { fetchImpl });
    expect(r.webStatus).toBe("timeout");
    expect(r.signals.websiteReachable).toBe(false);
  });
});
