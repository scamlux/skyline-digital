import { describe, expect, it } from "vitest";
import { extractPresence, normalizeUzPhone } from "./presence";

describe("extractPresence", () => {
  it("collects handles, contacts, maps, payments and languages", () => {
    const p = extractPresence({
      urls: [
        "https://www.instagram.com/dental.smile.uz/",
        "https://instagram.com/p/C123abc/", // a post, not a profile
        "https://t.me/dentalsmile_bot",
        "https://t.me/share/url?url=x", // share widget, not a channel
        "https://wa.me/998901234567",
        "https://api.whatsapp.com/send?phone=998935554433",
        "mailto:info@smile.uz?subject=hi",
        "tel:+998 (71) 200-00-00",
        "https://yandex.uz/maps/org/smile/123/",
        "https://2gis.uz/tashkent/firm/7000",
        "https://checkout.paycom.uz/abc",
        "https://my.click.uz/services/pay",
        "https://www.youtube.com/@smileclinic",
        "https://www.youtube.com/watch?v=abc",
        "https://www.tiktok.com/@smile.uz",
        "https://facebook.com/sharer.php?u=x",
      ],
      text: "Звоните: +998 90 111 22 33 или пишите hello@smile.uz",
      langs: ["ru", "uz-Latn", "en-US", "x-default"],
    });
    expect(p.instagram).toEqual(["dental.smile.uz"]);
    expect(p.telegram).toEqual(["dentalsmile_bot"]);
    expect(p.whatsapp).toEqual(["+998901234567", "+998935554433"]);
    expect(p.emails).toEqual(expect.arrayContaining(["info@smile.uz", "hello@smile.uz"]));
    expect(p.phones).toEqual(expect.arrayContaining(["+998712000000", "+998901112233"]));
    expect(p.maps.sort()).toEqual(["2gis", "yandex"]);
    expect(p.payments.sort()).toEqual(["click", "payme"]);
    expect(p.youtube).toEqual(["@smileclinic"]);
    expect(p.tiktok).toEqual(["smile.uz"]);
    expect(p.facebook).toEqual([]);
    expect(p.languages).toEqual(["ru", "uz", "en"]);
  });

  it("caps every list so the stored row stays small", () => {
    const urls = Array.from({ length: 20 }, (_, i) => `https://t.me/channel_${i}`);
    // handles are ≥ 4 chars, these are fine
    expect(extractPresence({ urls, text: "", langs: [] }).telegram).toHaveLength(5);
  });

  it("ignores garbage input", () => {
    const p = extractPresence({ urls: ["javascript:void(0)", "#", "not a url"], text: "", langs: ["??"] });
    expect(Object.values(p).every((v) => Array.isArray(v) && v.length === 0)).toBe(true);
  });
});

describe("normalizeUzPhone", () => {
  it("normalises common spellings", () => {
    expect(normalizeUzPhone("+998 (90) 123-45-67")).toBe("+998901234567");
    expect(normalizeUzPhone("901234567")).toBe("+998901234567");
    expect(normalizeUzPhone("12345")).toBeNull();
  });
});

describe("extractPresence — hostile input", () => {
  it("survives malformed %-escapes in links (a real site broke the whole audit)", () => {
    const p = extractPresence({
      urls: ["https://instagram.com/%E0%A4%A", "mailto:%zz@x.uz", "https://t.me/%"],
      text: "",
      langs: [],
    });
    // Not valid handles — dropped instead of stored as garbage.
    expect(p.instagram).toEqual([]);
    expect(p.telegram).toEqual([]);
  });
});
