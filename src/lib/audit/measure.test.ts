import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { measureSite } from "./measure";
import type { RedirectResult } from "./guard";

const PAGE_HOME = `<!doctype html><html lang="ru"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Fixture Home</title>
<meta name="description" content="A small fixture page for the audit engine tests.">
<meta property="og:title" content="Fixture"><meta property="og:image" content="/og.png">
<link rel="icon" href="/favicon.ico">
<script type="application/ld+json">{"@type":"WebSite"}</script>
</head><body>
<h1>Welcome</h1>
<img src="/a.png" alt="described">
<img src="/b.png">
<form><input type="email" name="email"><button type="submit">Send</button></form>
<a href="tel:+998901234567">Call</a>
<footer>© 2026 Fixture Co</footer>
</body></html>`;

const PAGE_NOVIEWPORT = `<!doctype html><html><head><title>No Viewport</title></head><body><h1>Hi</h1></body></html>`;

let server: Server;
let base = "";

beforeAll(async () => {
  server = createServer((req, res) => {
    if (req.url === "/noviewport") {
      res.writeHead(200, { "content-type": "text/html" });
      res.end(PAGE_NOVIEWPORT);
      return;
    }
    if (req.url === "/") {
      res.writeHead(200, { "content-type": "text/html" });
      res.end(PAGE_HOME);
      return;
    }
    res.writeHead(404).end("nope");
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address() as AddressInfo;
  base = `http://127.0.0.1:${port}`;
});

afterAll(() => new Promise<void>((resolve) => server.close(() => resolve())));

/** Test seam: skip the SSRF guard so we can point the browser at the loopback fixture. */
function allow(url: string): (u: string) => Promise<RedirectResult> {
  return async () => ({ finalUrl: url, status: 200, hops: 0 });
}

describe("measureSite — SSRF guard integration", () => {
  it("returns reachable:false / BLOCKED_ADDRESS for a loopback target (no browser launched)", async () => {
    const m = await measureSite(`${base}/`);
    expect(m.reachable).toBe(false);
    expect(m.error).toBe("BLOCKED_ADDRESS");
  });

  it("returns INVALID_URL for garbage", async () => {
    const m = await measureSite("http://");
    expect(m.reachable).toBe(false);
    expect(m.error).toBe("INVALID_URL");
  });
});

describe("measureSite — real measurement against a fixture (launches Chrome)", () => {
  it("measures a well-formed page", async () => {
    const url = `${base}/`;
    const m = await measureSite(url, { screenshot: false, resolveChain: allow(url) });
    expect(m.reachable).toBe(true);
    expect(m.httpStatus).toBe(200);
    expect(m.seo.title).toBe("Fixture Home");
    expect(m.seo.h1Count).toBe(1);
    expect(m.seo.langAttribute).toBe("ru");
    expect(m.seo.hasOpenGraph).toBe(true);
    expect(m.seo.hasStructuredData).toBe(true);
    expect(m.seo.imagesWithoutAlt).toBe(1);
    expect(m.mobile.hasViewportMeta).toBe(true);
    expect(m.business.hasContactForm).toBe(true);
    expect(m.business.hasPhoneLink).toBe(true);
    expect(m.business.copyrightYear).toBe(2026);
    expect(m.speed.requestCount).toBeGreaterThan(0);
  }, 30_000);

  it("flags a page without a viewport meta", async () => {
    const url = `${base}/noviewport`;
    const m = await measureSite(url, { screenshot: false, resolveChain: allow(url) });
    expect(m.reachable).toBe(true);
    expect(m.mobile.hasViewportMeta).toBe(false);
  }, 30_000);
});
