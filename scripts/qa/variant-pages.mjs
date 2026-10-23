// QA страниц вариантов: скриншоты 1440 и 390 (isMobile), горизонтальный скролл, ошибки JS.
// Запуск: SITE_VERSION_OVERRIDE=<studio|ref> next build && next start -p 3100, затем
//   node scripts/qa/variant-pages.mjs <outDir> /projects /projects/tgpg ...
// Chrome — локальный (CHROME_PATH), Playwright/Chromium не ставим.
import fs from "node:fs";
import puppeteer from "puppeteer-core";

const BASE = process.env.BASE || "http://localhost:3100";
const CHROME = process.env.CHROME_PATH || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const [out, ...paths] = process.argv.slice(2);
if (!out || !paths.length) {
  console.error("usage: node scripts/qa/variant-pages.mjs <outDir> <path>...");
  process.exit(2);
}
fs.mkdirSync(out, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const VIEWPORTS = {
  d: { width: 1440, height: 900 },
  m: { width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
};

const browser = await puppeteer.launch({ executablePath: CHROME, headless: "new", args: ["--hide-scrollbars"] });
const report = {};
for (const [tag, vp] of Object.entries(VIEWPORTS)) {
  const page = await browser.newPage();
  await page.setViewport(vp);
  // Прелоадер — один раз за сессию: помечаем его показанным, чтобы снимать сразу страницу.
  await page.evaluateOnNewDocument(() => sessionStorage.setItem("r-pre-seen", "1"));
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => m.type() === "error" && !/_vercel|status of 404/.test(m.text()) && errors.push(m.text()));
  for (const p of paths) {
    const name = p.replace(/^\//, "").replace(/\//g, "_") || "home";
    const res = await page.goto(BASE + p, { waitUntil: "networkidle0" });
    await sleep(500);
    await page.screenshot({ path: `${out}/${tag}-${name}-top.png` });
    const h = await page.evaluate(() => document.body.scrollHeight);
    // Пролистываем, чтобы сработали появления/ленивые картинки, затем полная страница.
    for (let y = 0; y < h; y += 700) {
      await page.evaluate((y) => scrollTo(0, y), y);
      await sleep(120);
    }
    await sleep(500);
    await page.screenshot({ path: `${out}/${tag}-${name}-full.png`, fullPage: true });
    report[`${tag} ${p}`] = {
      status: res?.status(),
      site: await page.evaluate(() => document.querySelector("[data-site]")?.getAttribute("data-site") ?? "old"),
      overflow: await page.evaluate(() => document.documentElement.scrollWidth - innerWidth),
      h1: await page.evaluate(() => document.querySelector("h1")?.textContent?.trim().slice(0, 50)),
    };
  }
  report[`${tag} errors`] = errors;
  await page.close();
}
await browser.close();
console.log(JSON.stringify(report, null, 1));
