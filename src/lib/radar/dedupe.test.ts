import { describe, it, expect } from "vitest";
import { dedupe, isDuplicate, normalizeCompanyName, mergeCompanies, last10 } from "./dedupe";
import type { Company } from "./types";

const C = (over: Partial<Company>): Company => ({
  name: "Клиника",
  phone: null,
  industry: "dentistry",
  city: "Ташкент",
  website: null,
  email: null,
  socialLinks: [],
  source: "yellowpages",
  sourceUrl: null,
  geo: null,
  ...over,
});

describe("normalizeCompanyName", () => {
  it("drops legal forms, punctuation, hyphens", () => {
    expect(normalizeCompanyName('ООО «Дент-Люкс».')).toBe("дент люкс");
  });
});

describe("last10", () => {
  it("takes last 10 digits", () => {
    expect(last10("+998 90 123 45 67")).toBe("8901234567");
    expect(last10("123")).toBeNull();
  });
});

describe("isDuplicate (strict)", () => {
  it("same phone → duplicate", () => {
    expect(isDuplicate(C({ phone: "+998901234567", name: "A" }), C({ phone: "+998901234567", name: "B" }))).toBe(true);
  });
  it("different phones → distinct", () => {
    expect(isDuplicate(C({ phone: "+998901234567" }), C({ phone: "+998907654321" }))).toBe(false);
  });
  it("no phone: same first word + ≤1 edit → dup", () => {
    expect(isDuplicate(C({ name: "Дент Люкс", city: "Ташкент" }), C({ name: "Дент-Люкс", city: "Ташкент" }))).toBe(true);
  });
  it("no phone: different first word → not dup", () => {
    expect(isDuplicate(C({ name: "Смайл Дент" }), C({ name: "Дент Люкс" }))).toBe(false);
  });
  it("no phone: length diff > 3 → not dup", () => {
    expect(isDuplicate(C({ name: "Дент" }), C({ name: "Дент Люкс Клиника" }))).toBe(false);
  });
  it("different known cities → not dup", () => {
    expect(isDuplicate(C({ name: "Дент Люкс", city: "Ташкент" }), C({ name: "Дент Люкс", city: "Самарканд" }))).toBe(false);
  });
});

describe("dedupe", () => {
  it("collapses 5 phone-duplicates into 1, merging signals", () => {
    const dups = [
      C({ name: "Дент Люкс", phone: "+998901234567", source: "olx" }),
      C({ name: "Дент-Люкс", phone: "+998901234567", website: "https://dentlux.uz", source: "yellowpages" }),
      C({ name: "ООО Дент Люкс", phone: "+998901234567", email: "info@dentlux.uz", source: "gigal" }),
      C({ name: "Дент Люкс клиника", phone: "+998901234567", socialLinks: ["https://t.me/dentlux"], source: "2gis" }),
      C({ name: "Дент Люкс", phone: "+998901234567", source: "google" }),
    ];
    const out = dedupe([...dups, C({ name: "Смайл", phone: "+998900000000" })]);
    expect(out).toHaveLength(2);
    const lux = out.find((c) => c.phone === "+998901234567")!;
    expect(lux.website).toBe("https://dentlux.uz");
    expect(lux.email).toBe("info@dentlux.uz");
    expect(lux.socialLinks).toContain("https://t.me/dentlux");
    expect(lux.source).toBe("google"); // highest-ranked source wins
  });

  it("merge unions socials, prefers non-null, higher-rank primary", () => {
    const m = mergeCompanies(
      C({ source: "yellowpages", socialLinks: ["a"], website: "https://x.uz" }),
      C({ source: "olx", socialLinks: ["b"], email: "x@x.uz" }),
    );
    expect(m.socialLinks.sort()).toEqual(["a", "b"]);
    expect(m.website).toBe("https://x.uz");
    expect(m.email).toBe("x@x.uz");
    expect(m.source).toBe("yellowpages");
  });
});
