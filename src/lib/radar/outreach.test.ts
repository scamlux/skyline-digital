import { describe, expect, it } from "vitest";
import { csvField, extractChannels, isUsableEmail, toCsv } from "./outreach";

describe("extractChannels", () => {
  it("picks first t.me and wa.me", () => {
    expect(
      extractChannels(["https://instagram.com/x", "https://t.me/abc", "https://wa.me/998901234567", "https://t.me/second"]),
    ).toEqual({ telegram: "https://t.me/abc", whatsapp: "https://wa.me/998901234567" });
  });
  it("handles null/empty", () => {
    expect(extractChannels(null)).toEqual({ telegram: "", whatsapp: "" });
  });
});

describe("isUsableEmail", () => {
  it("accepts real, rejects junk", () => {
    expect(isUsableEmail("info@cafe.uz")).toBe(true);
    expect(isUsableEmail("logo@2x.png")).toBe(false);
    expect(isUsableEmail("your@email.com")).toBe(false);
    expect(isUsableEmail(null)).toBe(false);
  });
});

describe("csv", () => {
  it("quotes commas, quotes, newlines", () => {
    expect(csvField('a,"b"')).toBe('"a,""b"""');
    expect(csvField("x\ny")).toBe('"x\ny"');
    expect(csvField(null)).toBe("");
  });
  it("starts with BOM", () => {
    expect(toCsv(["a"], [["Привет"]])).toBe("﻿a\r\nПривет\r\n");
  });
});

import { contactLooksOff, dedupe, handleOf, hostOf, isBlocked } from "./outreach";

describe("blocklist", () => {
  it("matches host, subdomain and email domain", () => {
    expect(isBlocked("https://www.ihg.com/x", null)).toBe(true);
    expect(isBlocked("https://a.gamma.site", null)).toBe(true);
    expect(isBlocked("https://x.tilda.ws", null)).toBe(false);
    expect(isBlocked("https://hotel.uz", "tashkent@ihg.com")).toBe(true);
    expect(isBlocked("https://notihg.com", null)).toBe(false);
  });
  it("hostOf strips www", () => {
    expect(hostOf("https://WWW.Bekmen.uz/a")).toBe("bekmen.uz");
  });
});

describe("dedupe", () => {
  const mk = (name: string, score: number, host: string, email = "") => ({ name, score, host, email });
  it("merges by host, keeps worst score, counts branches", () => {
    const r = dedupe([mk("A1", 60, "a.uz"), mk("A2", 40, "a.uz"), mk("B", 50, "b.uz")]);
    expect(r).toHaveLength(2);
    const a = r.find((x) => x.row.host === "a.uz")!;
    expect(a.row.name).toBe("A2");
    expect(a.branches).toBe(2);
    expect(a.branchNames).toEqual(["A1", "A2"]);
  });
  it("merges transitively by email", () => {
    const r = dedupe([mk("X", 50, "x.uz", "i@m.com"), mk("Y", 45, "y.uz", "i@m.com"), mk("Z", 70, "y.uz")]);
    expect(r).toHaveLength(1);
    expect(r[0].branches).toBe(3);
    expect(r[0].row.name).toBe("Y");
  });
});

describe("contactLooksOff", () => {
  it("flags unrelated handle", () => {
    expect(contactLooksOff("Taht Hotel Tashkent", "tahthotel.uz", ["bb_house_uz"])).toBe(true);
    expect(contactLooksOff("Dental Plus", "dentalplus.uz", ["galinasergeevna2702"])).toBe(true);
  });
  it("accepts related and transliterated", () => {
    expect(contactLooksOff("Taht Hotel", "x.uz", ["taht_hotel"])).toBe(false);
    expect(contactLooksOff("Дента Люкс", "x.uz", ["denta_lyuks"])).toBe(false);
    expect(contactLooksOff("Foo", "", [])).toBe(false);
  });
  it("handleOf parses urls", () => {
    expect(handleOf("https://instagram.com/Foo.Bar/")).toBe("foo.bar");
    expect(handleOf("https://t.me/abc")).toBe("abc");
  });
});
