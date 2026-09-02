import { describe, it, expect } from "vitest";
import { dedupe, isDuplicate, similarity, normalizeCompanyName, mergeCompanies } from "./dedupe";
import type { Company } from "./types";

const C = (over: Partial<Company>): Company => ({
  name: "Клиника",
  phone: null,
  industry: "dentistry",
  city: "Ташкент",
  website: null,
  email: null,
  socialLinks: [],
  source: "pc",
  sourceUrl: null,
  geo: null,
  ...over,
});

describe("similarity / normalizeCompanyName", () => {
  it("ignores case, punctuation, legal forms", () => {
    expect(normalizeCompanyName('ООО «Дент-Люкс».')).toBe("дент-люкс");
    expect(similarity("Дент Люкс", "дент-люкс")).toBeGreaterThan(0.8);
  });
});

describe("isDuplicate", () => {
  it("same phone → duplicate", () => {
    expect(isDuplicate(C({ phone: "+998901234567", name: "A" }), C({ phone: "+998901234567", name: "B" }))).toBe(true);
  });
  it("different phones → distinct", () => {
    expect(isDuplicate(C({ phone: "+998901234567" }), C({ phone: "+998907654321" }))).toBe(false);
  });
  it("no phone → fuzzy name+city", () => {
    expect(isDuplicate(C({ name: "Дент Люкс", city: "Ташкент" }), C({ name: "Дент-Люкс", city: "Ташкент" }))).toBe(true);
    expect(isDuplicate(C({ name: "Дент Люкс", city: "Ташкент" }), C({ name: "Смайл", city: "Ташкент" }))).toBe(false);
  });
});

describe("dedupe", () => {
  it("collapses 5 duplicates of one business into 1", () => {
    const dups = [
      C({ name: "Дент Люкс", phone: "+998901234567", source: "olx" }),
      C({ name: "Дент-Люкс", phone: "+998901234567", website: "https://dentlux.uz", source: "pc" }),
      C({ name: "ООО «Дент Люкс»", phone: "+998901234567", email: "info@dentlux.uz", source: "gigal" }),
      C({ name: "Дент Люкс клиника", phone: "+998901234567", socialLinks: ["https://t.me/dentlux"], source: "2gis" }),
      C({ name: "Дент Люкс", phone: "+998901234567", source: "yellowpages" }),
    ];
    const out = dedupe([...dups, C({ name: "Смайл", phone: "+998900000000" })]);
    expect(out).toHaveLength(2);
    const lux = out.find((c) => c.phone === "+998901234567")!;
    // merged signals survive from the various sources
    expect(lux.website).toBe("https://dentlux.uz");
    expect(lux.email).toBe("info@dentlux.uz");
    expect(lux.socialLinks).toContain("https://t.me/dentlux");
    // richest-ranked source (yellowpages) wins as primary
    expect(lux.source).toBe("yellowpages");
  });

  it("merge unions social links and prefers non-null fields", () => {
    const m = mergeCompanies(
      C({ source: "pc", socialLinks: ["a"], website: "https://x.uz" }),
      C({ source: "olx", socialLinks: ["b"], email: "x@x.uz" }),
    );
    expect(m.socialLinks.sort()).toEqual(["a", "b"]);
    expect(m.website).toBe("https://x.uz");
    expect(m.email).toBe("x@x.uz");
    expect(m.source).toBe("pc"); // higher rank
  });
});
