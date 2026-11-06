// Скриншоты шаблона «Салон»: hero (первый экран) и полная страница для стилей A/B на 1440 и 390,
// проверка горизонтального скролла и ошибок консоли. Chrome — локальный, Playwright/Chromium не ставим.
// Запуск: node scripts/qa/salon-shots.mjs <outDir> (BASE=http://localhost:3102)
import fs from "node:fs";
import puppeteer from "puppeteer-core";

const BASE = process.env.BASE || "http://localhost:3102";
const CHROME = process.env.CHROME_PATH || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const out = process.argv[2] || "/tmp/salon-shots";
fs.mkdirSync(out, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const VIEWPORTS = {
  1440: { width: 1440, height: 900 },
  390: { width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
  360: { width: 360, height: 740, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
};
const only = (process.env.ONLY || "1440,390").split(",");
const pages = (process.env.PAGES || "a,b,admin").split(",");

const browser = await puppeteer.launch({ executablePath: CHROME, headless: "new", args: ["--hide-scrollbars"] });
const report = {};
for (const w of only) {
  const page = await browser.newPage();
  await page.setViewport(VIEWPORTS[w]);
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => m.type() === "error" && !/_vercel|status of 404/.test(m.text()) && errors.push(m.text()));
  for (const p of pages) {
    const path = p === "admin" ? "/sites/salon/admin" : `/sites/salon/${p}`;
    await page.goto(BASE + path, { waitUntil: "networkidle0" });
    await sleep(1800);
    const name = p === "admin" ? "admin-overview" : `site-${p}`;
    await page.screenshot({ path: `${out}/salon-${p === "admin" ? "admin-overview" : `hero-${p}`}-${w}.png` });
    if (p !== "admin") {
      const h = await page.evaluate(() => document.body.scrollHeight);
      for (let y = 0; y < h; y += 500) {
        await page.evaluate((y) => scrollTo(0, y), y);
        await sleep(110);
      }
      await sleep(600);
      await page.evaluate(() => scrollTo(0, 0));
      await sleep(300);
      // Полная страница при DPR 2 на телефоне выше лимита снимка Chrome (16384 px): картинка начинала повторять верх.
      await page.setViewport({ ...VIEWPORTS[w], deviceScaleFactor: 1 });
      await sleep(300);
      await page.screenshot({ path: `${out}/salon-${name}-${w}.png`, fullPage: true });
      await page.setViewport(VIEWPORTS[w]);
    }
    report[`${w} ${p}`] = { overflow: await page.evaluate(() => document.documentElement.scrollWidth - innerWidth) };
  }
  report[`${w} errors`] = errors;
  await page.close();
}
await browser.close();
console.log(JSON.stringify(report, null, 1));
