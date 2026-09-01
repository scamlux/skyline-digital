import { describe, it, expect } from "vitest";
import {
  GuardError,
  hostKey,
  normalizeUrl,
  isBlockedIp,
  isBlockedHostname,
  guardUrl,
  guardRedirectChain,
  type Resolver,
} from "./guard";

/** Resolver stub: map hostnames to fixed IPs. Unknown host → DNS failure. */
function fakeResolver(map: Record<string, string[]>): Resolver {
  return async (host) => {
    const ips = map[host.toLowerCase()];
    if (!ips) throw new Error("ENOTFOUND");
    return ips;
  };
}

async function codeOf(p: Promise<unknown>): Promise<string> {
  try {
    await p;
    return "NO_ERROR";
  } catch (e) {
    return e instanceof GuardError ? e.code : "OTHER";
  }
}

describe("normalizeUrl / hostKey", () => {
  it("collapses scheme-less, http and mixed-case URLs to one host key", () => {
    const key = "example.uz";
    expect(hostKey("example.uz")).toBe(key);
    expect(hostKey("http://example.uz")).toBe(key);
    expect(hostKey("https://Example.UZ/path?a=1#h")).toBe(key);
  });

  it("adds https:// when scheme is missing and drops the fragment", () => {
    expect(normalizeUrl("example.uz")).toBe("https://example.uz/");
    expect(normalizeUrl("https://Example.UZ/path?a=1#h")).toBe(
      "https://example.uz/path?a=1",
    );
  });

  it("rejects empty and malformed input with INVALID_URL", async () => {
    expect(await codeOf(Promise.resolve().then(() => normalizeUrl("")))).toBe(
      "INVALID_URL",
    );
    expect(
      await codeOf(Promise.resolve().then(() => normalizeUrl("http://"))),
    ).toBe("INVALID_URL");
  });
});

describe("isBlockedIp", () => {
  const blocked = [
    "127.0.0.1",
    "127.9.9.9",
    "10.0.0.5",
    "172.16.0.1",
    "172.31.255.255",
    "192.168.1.1",
    "169.254.0.1",
    "169.254.169.254", // cloud metadata
    "0.0.0.0",
    "100.64.1.1", // CGNAT
    "::1",
    "fc00::1",
    "fd12:3456::1",
    "fe80::1",
    "::ffff:127.0.0.1", // IPv4-mapped loopback bypass
    "::ffff:169.254.169.254",
    "::", // unspecified
  ];
  for (const ip of blocked) {
    it(`blocks ${ip}`, () => expect(isBlockedIp(ip)).toBe(true));
  }

  const allowed = ["8.8.8.8", "1.1.1.1", "185.196.212.52", "2606:4700:4700::1111"];
  for (const ip of allowed) {
    it(`allows public ${ip}`, () => expect(isBlockedIp(ip)).toBe(false));
  }

  it("refuses garbage that is not an IP", () => {
    expect(isBlockedIp("not-an-ip")).toBe(true);
  });
});

describe("isBlockedHostname", () => {
  for (const h of ["localhost", "LOCALHOST", "db.local", "svc.internal", "x.localhost"]) {
    it(`blocks ${h}`, () => expect(isBlockedHostname(h)).toBe(true));
  }
  for (const h of ["example.uz", "skyline-digital.uz", "internal-metrics.com"]) {
    it(`allows ${h}`, () => expect(isBlockedHostname(h)).toBe(false));
  }
});

describe("guardUrl — schemes and ports", () => {
  const resolver = fakeResolver({ "example.uz": ["93.184.216.34"] });

  for (const bad of [
    "file:///etc/passwd",
    "ftp://example.uz",
    "data:text/html,x",
    "gopher://example.uz",
  ]) {
    it(`rejects scheme in ${bad}`, async () => {
      expect(await codeOf(guardUrl(bad, { resolver }))).toBe("BLOCKED_ADDRESS");
    });
  }

  for (const bad of ["http://example.uz:22", "https://example.uz:8080", "http://example.uz:3000"]) {
    it(`rejects non-default port in ${bad}`, async () => {
      expect(await codeOf(guardUrl(bad, { resolver }))).toBe("BLOCKED_ADDRESS");
    });
  }

  it("allows default ports and empty port", async () => {
    await expect(guardUrl("http://example.uz", { resolver })).resolves.toBeInstanceOf(URL);
    await expect(guardUrl("https://example.uz:443", { resolver })).resolves.toBeInstanceOf(URL);
  });
});

describe("guardUrl — addresses (acceptance §11.5)", () => {
  const resolver = fakeResolver({
    "evil.example": ["169.254.169.254"],
    "good.example": ["93.184.216.34"],
    "dead.example": [], // unused; ENOTFOUND path below
  });

  const blockedTargets = [
    "http://localhost",
    "http://127.0.0.1",
    "http://169.254.169.254",
    "http://192.168.1.1",
    "http://[::1]/",
    "http://evil.example", // public name resolving to a private IP
  ];
  for (const t of blockedTargets) {
    it(`blocks ${t}`, async () => {
      expect(await codeOf(guardUrl(t, { resolver }))).toBe("BLOCKED_ADDRESS");
    });
  }

  it("allows a public host resolving to a public IP", async () => {
    await expect(guardUrl("https://good.example/page", { resolver })).resolves.toBeInstanceOf(URL);
  });

  it("maps DNS failure to DNS_FAILED", async () => {
    expect(await codeOf(guardUrl("https://nope.example", { resolver }))).toBe("DNS_FAILED");
  });

  it("checks IP literals directly without DNS", async () => {
    await expect(guardUrl("http://8.8.8.8", {})).resolves.toBeInstanceOf(URL);
    expect(await codeOf(guardUrl("http://10.0.0.1", {}))).toBe("BLOCKED_ADDRESS");
  });
});

describe("guardRedirectChain — re-checks every hop (acceptance §11.5)", () => {
  const resolver = fakeResolver({
    "public.example": ["93.184.216.34"],
    "hop2.example": ["93.184.216.34"],
    "internal.example": ["10.1.2.3"],
  });

  /** Build a fake fetch from a redirect map: url -> {status, location}. */
  function fakeFetch(routes: Record<string, { status: number; location?: string }>): typeof fetch {
    return (async (input: string | URL) => {
      const url = typeof input === "string" ? input : input.toString();
      const r = routes[url] ?? { status: 200 };
      return {
        status: r.status,
        headers: new Headers(r.location ? { location: r.location } : {}),
        body: null,
      } as unknown as Response;
    }) as unknown as typeof fetch;
  }

  it("follows a normal 200 and returns the final URL", async () => {
    const fetchImpl = fakeFetch({ "https://public.example/": { status: 200 } });
    const res = await guardRedirectChain("public.example", { resolver, fetchImpl });
    expect(res.status).toBe(200);
    expect(res.finalUrl).toBe("https://public.example/");
    expect(res.hops).toBe(0);
  });

  it("blocks a public host that 302s to a private IP", async () => {
    const fetchImpl = fakeFetch({
      "https://public.example/": { status: 302, location: "https://internal.example/" },
    });
    expect(
      await codeOf(guardRedirectChain("public.example", { resolver, fetchImpl })),
    ).toBe("BLOCKED_ADDRESS");
  });

  it("blocks a redirect straight to the metadata IP", async () => {
    const fetchImpl = fakeFetch({
      "https://public.example/": { status: 301, location: "http://169.254.169.254/latest/meta-data/" },
    });
    expect(
      await codeOf(guardRedirectChain("public.example", { resolver, fetchImpl })),
    ).toBe("BLOCKED_ADDRESS");
  });

  it("gives up after maxHops redirects", async () => {
    const fetchImpl = fakeFetch({
      "https://public.example/": { status: 302, location: "https://hop2.example/" },
      "https://hop2.example/": { status: 302, location: "https://public.example/" },
    });
    expect(
      await codeOf(guardRedirectChain("public.example", { resolver, fetchImpl, maxHops: 3 })),
    ).toBe("BLOCKED_ADDRESS");
  });
});
