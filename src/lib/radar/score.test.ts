import { describe, it, expect } from "vitest";
import { baseSignals, scoreCompany, scoreValue, gradeOf } from "./score";
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

describe("scoreValue (100-point)", () => {
  it("sums weights: website 40, email 20, social 15, cta/analytics 10, age 10, https 5", () => {
    expect(scoreValue(S({ websiteReachable: true }))).toBe(40);
    expect(scoreValue(S({ websiteReachable: true, hasEmail: true }))).toBe(60);
    expect(scoreValue(S({ websiteReachable: true, hasEmail: true, hasSocial: true }))).toBe(75);
    expect(scoreValue(S({ websiteReachable: true, hasEmail: true, hasSocial: true, https: true }))).toBe(80);
    expect(scoreValue(S({ hasCta: true, hasAnalytics: true }))).toBe(10); // OR, counted once
    expect(scoreValue(S({ domainAgeYears: 3 }))).toBe(10);
    expect(scoreValue(S({ domainAgeYears: 1 }))).toBe(0); // <2y
    expect(
      scoreValue(S({ websiteReachable: true, hasEmail: true, hasSocial: true, hasCta: true, domainAgeYears: 5, https: true })),
    ).toBe(100);
  });
});

describe("gradeOf", () => {
  it("A ≥ 70, B 40–69, C < 40", () => {
    expect(gradeOf(100)).toBe("A");
    expect(gradeOf(70)).toBe("A");
    expect(gradeOf(69)).toBe("B");
    expect(gradeOf(40)).toBe("B");
    expect(gradeOf(39)).toBe("C");
    expect(gradeOf(0)).toBe("C");
  });
});

describe("scoreCompany", () => {
  it("website only → B; nothing → C; site+email+social → A", () => {
    expect(scoreCompany(S({ websiteReachable: true }))).toBe("B");
    expect(scoreCompany(S())).toBe("C");
    expect(scoreCompany(S({ websiteReachable: true, hasEmail: true, hasSocial: true }))).toBe("A");
  });
  it("is deterministic — 10 runs identical", () => {
    const sig = S({ websiteReachable: true, hasEmail: true, hasSocial: true });
    expect(new Set(Array.from({ length: 10 }, () => scoreCompany(sig))).size).toBe(1);
  });
});

describe("baseSignals", () => {
  it("derives email/social from raw; website unreachable until enriched", () => {
    const s = baseSignals({ website: "https://x.uz", email: null, socialLinks: ["https://t.me/x"] });
    expect(s.websiteReachable).toBe(false);
    expect(s.hasSocial).toBe(true);
    expect(s.hasEmail).toBe(false);
  });
});
