import { launchBrowser } from "../browser";
import { CANVAS, type PostFormat } from "./types";

export interface RenderOptions {
  /** Формат кадра. JPEG по умолчанию — Instagram принимает только JPEG (§1.4). */
  type?: "png" | "jpeg";
  /** Качество JPEG (1–100). */
  quality?: number;
}

/**
 * HTML-слайды → буферы изображений. Один браузер на прогон (§3.4 — рендер стоит
 * времени, браузер переиспользуется). Работает и локально (Chrome), и на
 * Vercel (chromium-min) через общий launchBrowser().
 *
 * По умолчанию JPEG q92: Instagram Content Publishing API принимает только
 * JPEG; Telegram принимает и JPEG тоже — единый формат снимает самую частую
 * причину ошибки «media upload failed». Локальные превью CLI могут просить PNG.
 */
export async function renderSlides(
  htmls: string[],
  format: PostFormat = "post",
  opts: RenderOptions = {},
): Promise<Buffer[]> {
  const type = opts.type ?? "jpeg";
  const quality = opts.quality ?? 92;
  const { w, h } = CANVAS[format] ?? CANVAS.post;
  const browser = await launchBrowser();
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: w, height: h, deviceScaleFactor: 1 });
    const out: Buffer[] = [];
    for (const html of htmls) {
      await page.setContent(html, { waitUntil: "load" });
      await page.evaluate(() => document.fonts.ready);
      const shot =
        type === "jpeg"
          ? await page.screenshot({ type: "jpeg", quality })
          : await page.screenshot({ type: "png" });
      out.push(Buffer.from(shot));
    }
    await page.close();
    return out;
  } finally {
    await browser.close().catch(() => {});
  }
}
