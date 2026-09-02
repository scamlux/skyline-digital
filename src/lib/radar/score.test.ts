import { describe, it, expect } from "vitest";
import { baseSignals, contactInfo, scoreCompany, scoreValue } from "./score";
import type { Signals } from "./types";

const S = (over: Partial<Signals> = {}): Signals => ({
  websiteReachable: false,
  hasEmail: false,
  hasSocial: false,
  hasCta: false,
  hasAnalytics: false,
  domainAgeYears: null,
  https: false,
  ...over,
});

const CONTACT = { hasContact: true, hasTgBot: false };

describe("scoreValue (100-point web presence)", () => {
  it("sums weights: website 40, email 20, social 15, cta/analytics 10, age 10, https 5", () => {
    expect(scoreValue(S({ websiteReachable: true }))).toBe(40);
    expect(scoreValue(S({ websiteReachable: true, hasEmail: true }))).toBe(60);
    expect(scoreValue(S({ websiteReachable: true, hasEmail: true, hasSocial: true }))).toBe(75);
    expect(scoreValue(S({ hasCta: true, hasAnalytics: true }))).toBe(10); // OR, counted once
    expect(scoreValue(S({ domainAgeYears: 1 }))).toBe(0); // <2y
    expect(
      scoreValue(S({ websiteReachable: true, hasEmail: true, hasSocial: true, hasCta: true, domainAgeYears: 5, https: true })),
    ).toBe(100);
  });
});

describe("scoreCompany — sales-prospect grading (we sell websites)", () => {
  it("A: contactable, no working site, no tg-bot", () => {
    expect(scoreCompany(S(), CONTACT)).toBe("A");
    expect(scoreCompany(S({ hasSocial: true }), CONTACT)).toBe("A"); // insta ≠ сайт
  });

  it("tg-bot counts as being digitally served → not A", () => {
    expect(scoreCompany(S(), { hasContact: true, hasTgBot: true })).toBe("B");
  });

  it("B: contactable, site exists but weak (<70 presence)", () => {
    expect(scoreCompany(S({ websiteReachable: true }), CONTACT)).toBe("B"); // 40
    expect(scoreCompany(S({ websiteReachable: true, hasEmail: true }), CONTACT)).toBe("B"); // 60
  });

  it("C: strong web presence — already served", () => {
    expect(scoreCompany(S({ websiteReachable: true, hasEmail: true, hasSocial: true }), CONTACT)).toBe("C"); // 75
    expect(
      scoreCompany(S({ websiteReachable: true, hasEmail: true, hasCta: true, https: true }), CONTACT),
    ).toBe("C"); // 75
  });

  it("C: not contactable at all", () => {
    expect(scoreCompany(S(), { hasContact: false, hasTgBot: false })).toBe("C");
  });

  it("deterministic — 10 runs identical", () => {
    const sig = S({ websiteReachable: true });
    expect(new Set(Array.from({ length: 10 }, () => scoreCompany(sig, CONTACT))).size).toBe(1);
  });
});

describe("contactInfo", () => {
  it("phone or t.me link → contactable; t.me/...bot → hasTgBot", () => {
    expect(contactInfo({ phone: "+998901234567", socialLinks: [] })).toEqual({ hasContact: true, hasTgBot: false });
    expect(contactInfo({ phone: null, socialLinks: ["https://t.me/clinic"] })).toEqual({ hasContact: true, hasTgBot: false });
    expect(contactInfo({ phone: null, socialLinks: ["https://t.me/clinic_bot"] })).toEqual({ hasContact: true, hasTgBot: true });
    expect(contactInfo({ phone: null, socialLinks: ["https://instagram.com/x"] })).toEqual({ hasContact: false, hasTgBot: false });
  });
});

describe("baseSignals", () => {
  it("derives email/social from raw; website unreachable until enriched", () => {
    const s = baseSignals({ website: "https://x.uz", email: null, socialLinks: ["https://t.me/x"] });
    expect(s.websiteReachable).toBe(false);
    expect(s.hasSocial).toBe(true);
  });
});
