import puppeteer, { type Browser } from "puppeteer-core";

/**
 * Shared headless-Chromium launcher.
 *
 * Same strategy as the PDF renderer (src/lib/pdf/render.ts): @sparticuz
 * chromium-min on Vercel, an installed Google Chrome locally (no Chromium
 * download). Extracted so the audit engine reuses it without touching the PDF
 * subsystem. Keep the two launch configs in sync if either changes.
 */

const LOCAL_CHROME_CANDIDATES = [
  process.env.CHROME_EXECUTABLE_PATH,
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium-browser",
].filter(Boolean) as string[];

export async function launchBrowser(): Promise<Browser> {
  const isServerless = Boolean(process.env.VERCEL || process.env.AWS_REGION);

  let executablePath: string;
  let args: string[];

  if (isServerless) {
    const chromium = (await import("@sparticuz/chromium-min")).default;
    const pack =
      process.env.CHROMIUM_PACK_URL ??
      "https://github.com/Sparticuz/chromium/releases/download/v149.0.0/chromium-v149.0.0-pack.x64.tar";
    executablePath = await chromium.executablePath(pack);
    args = chromium.args;
  } else {
    executablePath =
      LOCAL_CHROME_CANDIDATES.find(Boolean) ?? LOCAL_CHROME_CANDIDATES[1];
    args = ["--no-sandbox", "--disable-setuid-sandbox"];
  }

  return puppeteer.launch({ executablePath, args, headless: true });
}
