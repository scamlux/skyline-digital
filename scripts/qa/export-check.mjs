// Проверка экспортированного сайта (scripts/export-template.mjs): раздаёт готовую папку out/ тиньким
// статическим сервером и гоняет в локальном Chrome (puppeteer-core; Playwright/Chromium не ставим).
//
//   node scripts/qa/export-check.mjs <папка-проекта> <restaurant|clinic|salon|cafe> [--shots <папка>]
//
// Проверяет страницы /, /en/, /uz/, /admin/: загрузка, ошибки консоли, 404 и упавшие запросы, отсутствие
// слоя студии (плашка «демо», «Заказать за 50 $», ссылки на /sites и /contact, @vercel/analytics),
// SEO (нет noindex на публичных страницах, canonical, og, hreflang, lang), картинки; затем сквозной
// сценарий записи/заказа и появление записи в кабинете (тот же origin, localStorage). Печатает JSON.
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import puppeteer from "puppeteer-core";

const CHROME = process.env.CHROME_PATH || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const MIME = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml", ".webp": "image/webp", ".jpg": "image/jpeg", ".png": "image/png", ".woff2": "font/woff2", ".txt": "text/plain", ".xml": "application/xml" };

/** Тиньки статический сервер с поведением типичного хостинга: /en/ → en/index.html, неизвестное → 404.html. */
function serve(root) {
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, "http://x");
    let file = path.join(root, decodeURIComponent(url.pathname));
    if (!file.startsWith(root)) return void res.writeHead(403).end();
    if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, "index.html");
    if (!fs.existsSync(file) && fs.existsSync(file + ".html")) file += ".html";
    if (!fs.existsSync(file)) {
      res.writeHead(404, { "content-type": MIME[".html"] });
      return void res.end(fs.existsSync(path.join(root, "404.html")) ? fs.readFileSync(path.join(root, "404.html")) : "not found");
    }
    res.writeHead(200, { "content-type": MIME[path.extname(file)] ?? "application/octet-stream" });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise((resolve) => server.listen(0, "127.0.0.1", () => resolve({ server, base: `http://127.0.0.1:${server.address().port}` })));
}

function dirSize(dir) {
  let total = 0;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    total += e.isDirectory() ? dirSize(p) : fs.statSync(p).size;
  }
  return total;
}

/** Клик через DOM: не мешают липкие панели. Возвращает, нашёлся ли элемент. */
const domClick = (page, selector, text) =>
  page.evaluate(
    (sel, txt) => {
      const el = [...document.querySelectorAll(sel)].find((e) => !e.disabled && (!txt || e.textContent.replace(/\s+/g, " ").includes(txt)));
      if (!el) return false;
      el.scrollIntoView({ block: "center" });
      el.click();
      return true;
    },
    selector,
    text,
  );
const exists = (page, selector) => page.evaluate((s) => !!document.querySelector(s), selector);

/** Сценарии записи/заказа по шаблонам; возвращают имя гостя, по которому ищем запись в кабинете. */
const FLOWS = {
  async restaurant(page) {
    await domClick(page, ".rs-hero .rs-cta");
    await page.waitForSelector("dialog.rs-sheet[open]", { timeout: 5000 });
    await domClick(page, "[data-next]");
    await sleep(350);
    await domClick(page, "[data-date]");
    for (const zone of ["hall", "tapchan"]) {
      await domClick(page, `[data-zone="${zone}"]`);
      for (const part of ["evening", "day", "morning"]) {
        await domClick(page, `[data-part="${part}"]`);
        await sleep(150);
        if (await exists(page, '[data-time][data-status="free"]')) break;
      }
      if (await exists(page, '[data-time][data-status="free"]')) break;
    }
    if (!(await domClick(page, '[data-time][data-status="free"]'))) throw new Error("нет свободного времени");
    await domClick(page, "[data-next]");
    await sleep(350);
    await page.type('input[name="name"]', "Тест Экспорт");
    await page.type('input[name="phone"]', "+998 90 123 45 67");
    await domClick(page, "[data-submit]");
    await page.waitForSelector(".rs-done", { timeout: 5000 });
    return "Тест Экспорт";
  },
  async clinic(page) {
    await domClick(page, ".cl-head-book");
    await page.waitForSelector("dialog.cl-sheet[open]", { timeout: 5000 });
    await sleep(300);
    await domClick(page, ".cl-sheet-act .cl-btn:not(.ghost)");
    await sleep(300);
    await page.waitForSelector(".cl-slots button:not([disabled])", { timeout: 5000 });
    const days = await page.$$(".cl-dates button:not([disabled])");
    await days[Math.min(1, days.length - 1)].evaluate((e) => e.click());
    await sleep(200);
    await domClick(page, ".cl-slots button:not([disabled])");
    await domClick(page, ".cl-sheet-act .cl-btn:not(.ghost)");
    await sleep(300);
    await page.type("#bk-name", "Тест Экспорт");
    await page.type("#bk-phone", "+998 90 123 45 67");
    await domClick(page, ".cl-sheet-act .cl-btn:not(.ghost)");
    await page.waitForSelector(".cl-success", { timeout: 5000 });
    return "Тест Экспорт";
  },
  async salon(page) {
    await domClick(page, "#hero-cta");
    await page.waitForSelector(".sl-sheet[open]", { timeout: 5000 });
    await sleep(300);
    await domClick(page, ".sl-sheet .sl-tile");
    await domClick(page, ".sl-next");
    await sleep(300);
    const days = await page.$$(".sl-days button:not([disabled])");
    await days[Math.min(1, days.length - 1)].evaluate((e) => e.click());
    await sleep(250);
    await domClick(page, ".sl-slots button:not([disabled])");
    await domClick(page, ".sl-next");
    await sleep(300);
    await page.type("#sl-name", "Тест Экспорт");
    await page.type("#sl-phone", "+998901112233");
    await domClick(page, ".sl-next");
    await page.waitForSelector(".sl-success", { timeout: 5000 });
    return "Тест Экспорт";
  },
  async cafe(page) {
    await domClick(page, ".cf-cats button", "Выпечка");
    await sleep(200);
    if (!(await domClick(page, '.cf-add[aria-label*="круассан"]'))) throw new Error("нет кнопки «круассан»");
    await sleep(300);
    await domClick(page, ".cf-sticky .cf-pill");
    await page.waitForSelector(".cf-cart[open] .cf-total", { timeout: 5000 });
    await domClick(page, ".cf-cart .cf-cta", "Дальше");
    await sleep(300);
    await domClick(page, '.cf-cart .cf-chips.big [role="radio"]');
    await domClick(page, ".cf-cart .cf-slots [role=radio]");
    await domClick(page, ".cf-cart .cf-cta", "Дальше");
    await sleep(300);
    await page.type('.cf-cart input[name="name"]', "Тест Экспорт");
    await page.type('.cf-cart input[name="phone"]', "+998901234567");
    await domClick(page, ".cf-cart .cf-cta", "Отправить");
    await page.waitForSelector(".cf-done", { timeout: 5000 });
    return "Тест Экспорт";
  },
};

const PAGES = ["/", "/en/", "/uz/", "/admin/"];
const STUDIO_TEXT = /Заказать за 50|Order for \$50|Oyiga 50 \$|50 \$\/мес/;

async function main() {
  const [projectDir, template] = process.argv.slice(2);
  const shotsIdx = process.argv.indexOf("--shots");
  const shots = shotsIdx > -1 ? process.argv[shotsIdx + 1] : null;
  if (!projectDir || !FLOWS[template]) {
    console.error("Использование: node scripts/qa/export-check.mjs <папка-проекта> <restaurant|clinic|salon|cafe> [--shots <папка>]");
    process.exit(2);
  }
  const outDir = path.resolve(projectDir, "out");
  if (!fs.existsSync(outDir)) throw new Error(`Нет ${outDir}: сначала \`npm run build\` в проекте.`);
  const { server, base } = await serve(outDir);
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: "new", args: ["--hide-scrollbars"] });
  const report = { template, outBytes: dirSize(outDir), pages: {}, flow: {}, notes: [] };
  if (shots) fs.mkdirSync(shots, { recursive: true });

  const ctx = await browser.createBrowserContext();
  // Всплывающие вкладки (t.me в режиме telegram) закрываем сразу: наружу сценарий не ходит.
  let popups = 0;
  ctx.on("targetcreated", async (t) => {
    if (t.type() !== "page") return;
    const p = await t.page().catch(() => null);
    if (p && !p.url().startsWith(base) && p.url() !== "about:blank") popups += 1;
    if (p && p.url() !== "about:blank" && !p.url().startsWith(base)) await p.close().catch(() => {});
  });

  const watch = async (page, sink) => {
    await page.setRequestInterception(true);
    page.on("request", (req) => {
      if (req.url().startsWith(base) || req.url().startsWith("data:")) return void req.continue();
      sink.external.push(req.url());
      req.abort();
    });
    page.on("pageerror", (e) => sink.errors.push(`pageerror: ${e.message}`));
    page.on("console", (m) => {
      if (m.type() !== "error") return;
      // Сообщение о статусе ресурса дублирует событие response (там есть адрес): разбираем его отдельно.
      if (/Failed to load resource/.test(m.text())) return;
      sink.errors.push(m.text());
    });
    page.on("response", (r) => {
      if (r.url().startsWith(base) && r.status() >= 400) sink.badResponses.push(`${r.status()} ${r.url()}`);
    });
    page.on("requestfailed", (r) => {
      if (r.url().startsWith(base)) sink.failed.push(`${r.failure()?.errorText} ${r.url()}`);
    });
  };

  for (const p of PAGES) {
    const sink = { errors: [], badResponses: [], failed: [], external: [] };
    const page = await ctx.newPage();
    await page.setViewport({ width: 1440, height: 900 });
    await watch(page, sink);
    const res = await page.goto(base + p, { waitUntil: "networkidle0" });
    await sleep(600);
    // Пролистываем страницу, чтобы подгрузились ленивые картинки.
    const height = await page.evaluate(() => document.documentElement.scrollHeight);
    for (let y = 0; y < height; y += 500) {
      await page.evaluate((v) => window.scrollTo(0, v), y);
      await sleep(80);
    }
    await sleep(500);
    const info = await page.evaluate(() => {
      const meta = (sel, attr) => document.querySelector(sel)?.getAttribute(attr) ?? null;
      const imgs = [...document.images];
      return {
        title: document.title,
        lang: document.documentElement.lang,
        robots: meta('meta[name="robots"]', "content"),
        canonical: meta('link[rel="canonical"]', "href"),
        ogImage: meta('meta[property="og:image"]', "content"),
        ogTitle: meta('meta[property="og:title"]', "content"),
        hreflang: [...document.querySelectorAll('link[rel="alternate"][hreflang]')].map((l) => l.getAttribute("hreflang")),
        tpl: !!document.querySelector("[data-tpl]"),
        images: imgs.length,
        brokenImages: imgs.filter((i) => !(i.complete && i.naturalWidth > 0)).map((i) => i.currentSrc || i.src),
        studioLinks: [...document.querySelectorAll("a[href]")].map((a) => a.getAttribute("href")).filter((h) => /^\/(\w\w\/)?(sites|contact)\b/.test(h)),
        studioText: document.body.innerText.slice(0, 20000),
        vercelScripts: [...document.scripts].map((s) => s.src).filter((s) => /vercel|_vercel|insights/.test(s)),
        demoBar: !!document.querySelector(".bg-night"),
        overflow: document.documentElement.scrollWidth - window.innerWidth,
      };
    });
    const isAdmin = p.includes("admin");
    report.pages[p] = {
      status: res.status(),
      ok: res.status() === 200,
      title: info.title,
      lang: info.lang,
      robots: info.robots,
      noindexOk: isAdmin ? /noindex/.test(info.robots ?? "") : !/noindex/.test(info.robots ?? "noindex-absent") || info.robots === null || !/noindex/.test(info.robots),
      canonical: info.canonical,
      ogImage: info.ogImage,
      hreflang: info.hreflang,
      templateRendered: isAdmin ? true : info.tpl,
      images: info.images,
      brokenImages: info.brokenImages,
      studioChrome: { demoBar: info.demoBar, links: info.studioLinks, text: STUDIO_TEXT.test(info.studioText), vercelScripts: info.vercelScripts },
      overflow: info.overflow,
      errors: sink.errors,
      badResponses: sink.badResponses,
      failedRequests: sink.failed,
      externalBlocked: [...new Set(sink.external)],
    };
    if (shots && p === "/") {
      await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
      await page.goto(base + p, { waitUntil: "networkidle0" });
      await sleep(900);
      await page.screenshot({ path: path.join(shots, `${template}-export-390.png`) });
    }
    await page.close();
  }

  // Сквозной сценарий: сайт → запись/заказ → кабинет того же origin видит запись.
  const sink = { errors: [], badResponses: [], failed: [], external: [] };
  const page = await ctx.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  await watch(page, sink);
  try {
    await page.goto(base + "/", { waitUntil: "networkidle0" });
    await sleep(800);
    const guest = await FLOWS[template](page);
    report.flow.submitted = true;
    await sleep(500);
    await page.goto(base + "/admin/", { waitUntil: "networkidle0" });
    await sleep(900);
    report.flow.inAdmin = (await page.evaluate(() => document.body.innerText)).includes(guest);
    report.flow.telegramPopups = popups;
  } catch (e) {
    report.flow.error = e.message;
  }
  report.flow.errors = sink.errors;
  report.flow.badResponses = sink.badResponses;
  report.flow.failedRequests = sink.failed;
  await page.close();

  await browser.close();
  server.close();
  const pageList = Object.values(report.pages);
  report.summary = {
    pagesOk: pageList.every((p) => p.ok && p.templateRendered),
    flowOk: report.flow.submitted === true && report.flow.inAdmin === true && !report.flow.error,
    consoleErrors: pageList.reduce((n, p) => n + p.errors.length, 0) + report.flow.errors.length,
    notFound: pageList.reduce((n, p) => n + p.badResponses.length + p.failedRequests.length, 0) + report.flow.badResponses.length + report.flow.failedRequests.length,
    studioChrome: pageList.some((p) => p.studioChrome.demoBar || p.studioChrome.links.length > 0 || p.studioChrome.text || p.studioChrome.vercelScripts.length > 0),
    noindexOk: pageList.every((p) => p.noindexOk),
    brokenImages: pageList.reduce((n, p) => n + p.brokenImages.length, 0),
    outMB: Number((report.outBytes / 1024 / 1024).toFixed(2)),
  };
  console.log(JSON.stringify(report, null, 2));
  process.exit(report.summary.pagesOk && report.summary.flowOk && report.summary.consoleErrors === 0 && report.summary.notFound === 0 && !report.summary.studioChrome && report.summary.noindexOk && report.summary.brokenImages === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(2);
});
