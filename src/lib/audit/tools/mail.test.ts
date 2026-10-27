import { describe, expect, it } from "vitest";
import { checkMail } from "./mail";

describe("checkMail", () => {
  it("reads MX, SPF and the DMARC policy", async () => {
    const r = await checkMail("www.shop.uz", {
      mx: async () => [{ exchange: "mx.shop.uz", priority: 10 }],
      txt: async (d) =>
        d === "shop.uz"
          ? [["v=spf1 include:_spf.google.com ~all"], ["google-site-verification=x"]]
          : [["v=DMARC1; p=quarantine; rua=mailto:x@shop.uz"]],
    });
    expect(r).toEqual({ domain: "shop.uz", mx: true, spf: true, dmarc: "quarantine" });
  });

  it("treats failed lookups as absent records and never throws", async () => {
    const r = await checkMail("nomail.uz", {
      mx: async () => { throw new Error("ENODATA"); },
      txt: async () => { throw new Error("ENOTFOUND"); },
    });
    expect(r).toEqual({ domain: "nomail.uz", mx: false, spf: false, dmarc: null });
  });

  it("a DMARC record without a policy counts as none", async () => {
    const r = await checkMail("a.uz", { mx: async () => [], txt: async (d) => (d.startsWith("_dmarc") ? [["v=DMARC1"]] : []) });
    expect(r.dmarc).toBe("none");
  });
});
