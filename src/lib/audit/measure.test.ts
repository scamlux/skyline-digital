import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { ENGINE_VERSION, measureSite } from "./measure";

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
/** Same server, different origin — NOT allow-listed, so the guard must block it. */
let blockedOrigin = "";

beforeAll(async () => {
  server = createServer((req, res) => {
    const html = (body: string) => {
      res.writeHead(200, { "content-type": "text/html" });
      res.end(body);
    };
    switch (req.url) {
      case "/":
        return html(PAGE_HOME);
      case "/noviewport":
        return html(PAGE_NOVIEWPORT);
      case "/redirect-private":
        // A public-looking page that 302s to a private address.
        res.writeHead(302, { location: `${blockedOrigin}/` });
        return res.end();
      case "/private-subresource":
        return html(
          `<!doctype html><html><head><title>Sub</title></head><body><h1>x</h1>` +
            `<img src="${blockedOrigin}/secret.png"></body></html>`,
        );
      case "/slow":
        // DOM is ready at once, but an image never finishes → `load` never fires.
        return html(
          `<!doctype html><html><head><title>Slow</title>` +
            `<meta name="viewport" content="width=device-width"></head>` +
            `<body><h1>Slow page</h1><img src="/hang.png"></body></html>`,
        );
      case "/conversion":
        return html(
          `<!doctype html><html><head><title>Conv</title>` +
            `<meta name="viewport" content="width=device-width">` +
            `<meta name="robots" content="noindex,follow">` +
            `<link rel="canonical" href="/canon"></head><body>` +
            `<a href="tel:+998901234567">Позвонить</a>` +
            `<a href="https://t.me/shop">Telegram</a>` +
            `<a href="https://instagram.com/conv.shop/">IG</a><a href="mailto:hi@conv.uz">mail</a>` +
            `<a href="/broken">x</a><a href="/">home</a>` +
            `<footer><a href="/privacy">Политика конфиденциальности</a></footer></body></html>`,
        );
      case "/hang.png":
        return; // never respond
      default:
        res.writeHead(404).end("nope");
    }
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address() as AddressInfo;
  base = `http://127.0.0.1:${port}`;
  blockedOrigin = `http://localhost:${port}`;
});

afterAll(() => {
  server.closeAllConnections();
  return new Promise<void>((resolve) => server.close(() => resolve()));
});

/** Test seam: exempt ONLY the fixture origin from the SSRF guard. */
const fixture = () => ({ screenshot: false, allowOrigins: [base] });

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

  it("blocks a redirect hop to a private address (re-checked inside the browser)", async () => {
    const m = await measureSite(`${base}/redirect-private`, fixture());
    expect(m.reachable).toBe(false);
    expect(m.error).toBe("BLOCKED_ADDRESS");
  }, 30_000);

  it("aborts a private-address subresource but still measures the page", async () => {
    const m = await measureSite(`${base}/private-subresource`, fixture());
    expect(m.reachable).toBe(true);
    expect(m.blockedRequests).toBeGreaterThanOrEqual(1);
  }, 30_000);
});

describe("measureSite — real measurement against a fixture (launches Chrome)", () => {
  it("measures a well-formed page", async () => {
    const m = await measureSite(`${base}/`, fixture());
    expect(m.reachable).toBe(true);
    expect(m.engineVersion).toBe(ENGINE_VERSION);
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
    expect(m.speed.loadTimedOut).toBe(false);
  }, 30_000);

  it("flags a page without a viewport meta", async () => {
    const m = await measureSite(`${base}/noviewport`, fixture());
    expect(m.reachable).toBe(true);
    expect(m.mobile.hasViewportMeta).toBe(false);
  }, 30_000);

  it("measures a page whose `load` never fires instead of reporting TIMEOUT", async () => {
    const m = await measureSite(`${base}/slow`, { ...fixture(), budgetMs: 14_000 });
    expect(m.reachable).toBe(true);
    expect(m.speed.loadTimedOut).toBe(true);
    expect(m.seo.title).toBe("Slow");
  }, 30_000);

  it("reads conversion and indexability signals", async () => {
    const m = await measureSite(`${base}/conversion`, fixture());
    expect(m.reachable).toBe(true);
    expect(m.business.ctaAboveFold).toBe(true);
    expect(m.business.hasMessengerLink).toBe(true);
    expect(m.business.hasPrivacyPolicy).toBe(true);
    expect(m.seo.noindex).toBe(true);
    expect(m.seo.canonical).toBe(`${base}/canon`);
    expect(m.speed.throttled).toBe(true);
    expect(m.tools?.presence?.instagram).toEqual(["conv.shop"]);
    expect(m.tools?.presence?.telegram).toEqual(["shop"]);
    expect(m.tools?.presence?.emails).toEqual(["hi@conv.uz"]);
    expect(m.tools?.links).toBeUndefined(); // basic mode: no link check
    expect(typeof m.speed.cls).toBe("number");
  }, 30_000);

  it("full tools mode checks same-host links through the guard", async () => {
    const m = await measureSite(`${base}/conversion`, { ...fixture(), tools: "full" });
    expect(m.reachable).toBe(true);
    expect(m.tools?.links?.checked).toBeGreaterThanOrEqual(1);
    expect(m.tools?.links?.broken.map((b) => b.status)).toContain(404);
    expect(m.tools?.mail?.domain).toBe("127.0.0.1");
  }, 40_000);

  it("does not treat the word 'telegram' in text as a messenger link", async () => {
    const m = await measureSite(`${base}/`, fixture());
    expect(m.business.hasMessengerLink).toBe(false);
    expect(m.business.hasPrivacyPolicy).toBe(false);
    expect(m.seo.noindex).toBe(false);
  }, 30_000);

  it("reports HTTP_ERROR from the browser's main response", async () => {
    const m = await measureSite(`${base}/missing`, fixture());
    expect(m.reachable).toBe(false);
    expect(m.error).toBe("HTTP_ERROR");
    expect(m.httpStatus).toBe(404);
  }, 30_000);
});
