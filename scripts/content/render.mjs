#!/usr/bin/env node
/**
 * HTML-слайды → PNG. Один браузер на весь прогон.
 *
 *   node scripts/content/render.mjs              # отрендерить всё, что собрано
 *   node scripts/content/render.mjs ceny-sajta   # один пост
 *
 * Браузер ищется по списку известных путей; переопределяется переменной
 * CHROME_EXECUTABLE_PATH. Тот же подход, что в src/lib/browser.ts.
 */
import { readdirSync, existsSync, statSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import puppeteer from "puppeteer-core";

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, "out");

const CANVAS = {
  post: { width: 1080, height: 1350 },
  square: { width: 1080, height: 1080 },
  story: { width: 1080, height: 1920 },
};

const CHROME_CANDIDATES = [
  process.env.CHROME_EXECUTABLE_PATH,
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Chromium.app/Contents/MacOS/Chromium",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium-browser",
  "/usr/bin/chromium",
].filter(Boolean);

function chromePath() {
  const found = CHROME_CANDIDATES.find((p) => existsSync(p));
  if (!found) {
    console.error(
      'Не нашёл Chrome. Запусти так:\n  CHROME_EXECUTABLE_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" node scripts/content/render.mjs',
    );
    process.exit(1);
  }
  return found;
}

const only = process.argv[2];

if (!existsSync(OUT)) {
  console.error("Нечего рендерить — сначала node scripts/content/build.mjs");
  process.exit(1);
}

const dirs = readdirSync(OUT)
  .filter((d) => statSync(join(OUT, d)).isDirectory())
  .filter((d) => !only || d === only);

if (!dirs.length) {
  console.error(only ? `Нет собранного поста ${only}` : "В out/ пусто");
  process.exit(1);
}

const browser = await puppeteer.launch({
  executablePath: chromePath(),
  args: ["--no-sandbox", "--disable-setuid-sandbox", "--font-render-hinting=none"],
  headless: true,
});

let total = 0;
for (const slug of dirs) {
  const dir = join(OUT, slug);
  const spec = JSON.parse(readFileSync(join(dir, "post.json"), "utf8"));
  const size = CANVAS[spec.format] ?? CANVAS.post;
  const page = await browser.newPage();
  await page.setViewport({ ...size, deviceScaleFactor: 1 });

  const files = readdirSync(dir)
    .filter((f) => f.endsWith(".html"))
    .sort();
  for (const f of files) {
    await page.goto(pathToFileURL(join(dir, f)).href, { waitUntil: "load" });
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: join(dir, f.replace(/\.html$/, ".png")), type: "png" });
    total++;
  }
  await page.close();
  console.log(`отрендерен  ${slug.padEnd(24)} ${files.length} PNG`);
}

await browser.close();
console.log(`\nГотово: ${total} PNG в scripts/content/out/*/`);
