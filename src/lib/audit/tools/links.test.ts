import { describe, expect, it } from "vitest";
import { checkLinks } from "./links";
import { GuardError, type RequestGuard } from "../guard";

/** Guard that blocks anything on 10.x — stands in for a private address. */
const guard: RequestGuard = async (url) => {
  if (new URL(url).hostname.startsWith("10.")) throw new GuardError("BLOCKED_ADDRESS", url);
};

function fakeFetch(map: Record<string, { status: number; location?: string; headOnly405?: boolean }>) {
  const calls: string[] = [];
  const impl = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    calls.push(`${init?.method} ${url}`);
    const r = map[url];
    if (!r) throw new Error("ECONNREFUSED");
    if (r.headOnly405 && init?.method === "HEAD") return new Response(null, { status: 405 });
    return new Response(null, { status: r.status, headers: r.location ? { location: r.location } : {} });
  }) as typeof fetch;
  return { impl, calls };
}

describe("checkLinks", () => {
  it("reports broken links and follows redirects", async () => {
    const { impl } = fakeFetch({
      "https://a.uz/ok": { status: 200 },
      "https://a.uz/gone": { status: 404 },
      "https://a.uz/old": { status: 301, location: "/new" },
      "https://a.uz/new": { status: 200 },
    });
    const r = await checkLinks(["https://a.uz/ok", "https://a.uz/gone", "https://a.uz/old", "https://a.uz/dead"], guard, { fetchImpl: impl });
    expect(r.checked).toBe(4);
    expect(r.broken).toEqual(
      expect.arrayContaining([
        { url: "https://a.uz/gone", status: 404 },
        { url: "https://a.uz/dead", status: null },
      ]),
    );
    expect(r.broken).toHaveLength(2);
  });

  it("never fetches a redirect hop to a private address — counts it as blocked", async () => {
    const { impl, calls } = fakeFetch({ "https://a.uz/x": { status: 302, location: "http://10.0.0.5/admin" } });
    const r = await checkLinks(["https://a.uz/x"], guard, { fetchImpl: impl });
    expect(r.blocked).toBe(1);
    expect(r.broken).toHaveLength(0);
    expect(calls.some((c) => c.includes("10.0.0.5"))).toBe(false);
  });

  it("retries with GET when HEAD is refused", async () => {
    const { impl, calls } = fakeFetch({ "https://a.uz/p": { status: 200, headOnly405: true } });
    const r = await checkLinks(["https://a.uz/p"], guard, { fetchImpl: impl });
    expect(r.broken).toHaveLength(0);
    expect(calls).toEqual(["HEAD https://a.uz/p", "GET https://a.uz/p"]);
  });

  it("caps the number of links checked", async () => {
    const { impl } = fakeFetch({});
    const links = Array.from({ length: 50 }, (_, i) => `https://a.uz/${i}`);
    expect((await checkLinks(links, guard, { fetchImpl: impl })).checked).toBe(30);
  });
});
