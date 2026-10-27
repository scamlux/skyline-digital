import { describe, expect, it } from "vitest";
import { contactsFill } from "./contacts";
import { extractPresence } from "@/lib/audit/tools/presence";

const presence = extractPresence({
  urls: ["https://instagram.com/smile.uz", "https://t.me/smile", "mailto:hi@smile.uz", "https://wa.me/998901234567"],
  text: "",
  langs: [],
});

describe("contactsFill", () => {
  it("fills empty fields from the site's contacts", () => {
    expect(contactsFill({ instagram: null, email: null, social_links: [] }, presence)).toEqual({
      instagram: "https://instagram.com/smile.uz",
      email: "hi@smile.uz",
      social_links: ["https://instagram.com/smile.uz", "https://t.me/smile", "https://wa.me/998901234567"],
    });
  });

  it("never overwrites existing values and only appends new links", () => {
    const out = contactsFill(
      { instagram: "https://instagram.com/old", email: "owner@x.uz", social_links: ["https://t.me/smile"] },
      presence,
    );
    expect(out.instagram).toBeUndefined();
    expect(out.email).toBeUndefined();
    expect(out.social_links).toEqual(["https://t.me/smile", "https://instagram.com/smile.uz", "https://wa.me/998901234567"]);
  });

  it("writes nothing without presence data", () => {
    expect(contactsFill({ instagram: null, email: null, social_links: null })).toEqual({});
  });
});
