import { describe, it, expect } from "vitest";
import { baseSignals, scoreCompany, signalCount } from "./score";
import type { Signals } from "./types";

const S = (over: Partial<Signals> = {}): Signals => ({
  hasWebsite: false,
  hasEmail: false,
  hasSocial: false,
  hasCta: false,
  domainAgeYears: null,
  responsive: false,
  ...over,
});

describe("scoreCompany", () => {
  it("A = 3+ signals AND responsive", () => {
    expect(scoreCompany(S({ hasWebsite: true, hasEmail: true, hasSocial: true, responsive: true }))).toBe("A");
    expect(scoreCompany(S({ hasWebsite: true, hasEmail: true, hasSocial: true, hasCta: true, responsive: true }))).toBe("A");
  });

  it("3+ signals but NOT responsive → B (not A)", () => {
    expect(scoreCompany(S({ hasWebsite: true, hasEmail: true, hasSocial: true, responsive: false }))).toBe("B");
  });

  it("B = 1–2 signals", () => {
    expect(scoreCompany(S({ hasWebsite: true }))).toBe("B");
    expect(scoreCompany(S({ hasWebsite: true, hasSocial: true }))).toBe("B");
    expect(scoreCompany(S({ hasSocial: true, responsive: true }))).toBe("B");
  });

  it("C = no signals", () => {
    expect(scoreCompany(S())).toBe("C");
    expect(scoreCompany(S({ responsive: true }))).toBe("C"); // responsive alone isn't a signal
  });

  it("is deterministic — 10 runs identical", () => {
    const sig = S({ hasWebsite: true, hasEmail: true, hasSocial: true, responsive: true });
    const out = Array.from({ length: 10 }, () => scoreCompany(sig));
    expect(new Set(out).size).toBe(1);
    expect(out[0]).toBe("A");
  });
});

describe("baseSignals / signalCount", () => {
  it("derives presence from raw fields", () => {
    const s = baseSignals({ website: "https://x.uz", email: null, socialLinks: ["https://t.me/x"] });
    expect(s.hasWebsite).toBe(true);
    expect(s.hasEmail).toBe(false);
    expect(s.hasSocial).toBe(true);
    expect(signalCount(s)).toBe(2);
  });
});
