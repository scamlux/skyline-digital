// Матрица акцентов: главная варианта (1440) с каждым из 5 акцентов админки.
// Акцент — это только --acc/--acc-ink на обёртке [data-site], поэтому подставляем
// значения BRAND_ACCENTS в браузере, без пересборки на каждый акцент.
// Запуск: SITE_VERSION_OVERRIDE=<studio|ref> next build && next start -p 3100,
//   node scripts/qa/accent-matrix.mjs <outDir> <tag>
import fs from "node:fs";
import puppeteer from "puppeteer-core";

const ACCENTS = {
  "dark-blue": ["#27406b", "#8fa6cf"],
  burgundy: ["#7a2638", "#cf8793"],
  khaki: ["#6d6a40", "#bcb784"],
  "dark-green": ["#2f5141", "#88b39c"],
  brass: ["#8a5a2b", "#caa06a"],
};
const [out, tag] = process.argv.slice(2);
fs.mkdirSync(out, { recursive: true });
const browser = await puppeteer.launch({
  executablePath: process.env.CHROME_PATH || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: "new",
  args: ["--hide-scrollbars"],
});
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900 });
await page.evaluateOnNewDocument(() => sessionStorage.setItem("r-pre-seen", "1"));
await page.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "reduce" }]);
await page.goto((process.env.BASE || "http://localhost:3100") + "/", { waitUntil: "networkidle0" });
for (const [name, [acc, ink]] of Object.entries(ACCENTS)) {
  await page.evaluate(
    (acc, ink) => {
      const el = document.querySelector("[data-site]");
      el.style.setProperty("--acc", acc);
      el.style.setProperty("--acc-ink", ink);
      scrollTo(0, 0);
    },
    acc,
    ink,
  );
  await new Promise((r) => setTimeout(r, 300));
  await page.screenshot({ path: `${out}/${tag}-${name}-hero.png` });
  // Второй кадр — секция, где акцент заметнее всего (цены/кнопки).
  await page.evaluate(() => document.querySelector("#services, #r-svc")?.scrollIntoView());
  await new Promise((r) => setTimeout(r, 300));
  await page.screenshot({ path: `${out}/${tag}-${name}-section.png` });
}
await browser.close();
console.log("ok", tag);
