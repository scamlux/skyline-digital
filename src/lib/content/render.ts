import { launchBrowser } from "../browser";
import { CANVAS, type PostFormat } from "./types";

/**
 * HTML-слайды → PNG-буферы. Один браузер на прогон (§3.4 — рендер стоит
 * времени, браузер переиспользуется). Работает и локально (Chrome), и на
 * Vercel (chromium-min) через общий launchBrowser().
 */
export async function renderSlides(
  htmls: string[],
  format: PostFormat = "post",
): Promise<Buffer[]> {
  const { w, h } = CANVAS[format] ?? CANVAS.post;
  const browser = await launchBrowser();
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: w, height: h, deviceScaleFactor: 1 });
    const out: Buffer[] = [];
    for (const html of htmls) {
      await page.setContent(html, { waitUntil: "load" });
      await page.evaluate(() => document.fonts.ready);
      const png = await page.screenshot({ type: "png" });
      out.push(Buffer.from(png));
    }
    await page.close();
    return out;
  } finally {
    await browser.close().catch(() => {});
  }
}
