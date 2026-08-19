import puppeteer from "puppeteer-core";

const LOCAL_CHROME_CANDIDATES = [
  process.env.CHROME_EXECUTABLE_PATH,
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium-browser",
].filter(Boolean) as string[];

/**
 * Render an HTML string to a PDF buffer.
 *
 * On Vercel (serverless) uses @sparticuz/chromium. Locally it points
 * puppeteer-core at an installed Google Chrome (no Chromium download —
 * override with CHROME_EXECUTABLE_PATH if needed).
 */
export async function htmlToPdf(html: string): Promise<Uint8Array> {
  const isServerless = Boolean(process.env.VERCEL || process.env.AWS_REGION);

  let executablePath: string;
  let args: string[];

  if (isServerless) {
    // chromium-min ships no binary; fetch the matching brotli pack at runtime.
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

  const browser = await puppeteer.launch({ executablePath, args, headless: true });
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "load" });
    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "0", right: "0", bottom: "0", left: "0" },
    });
    return pdf;
  } finally {
    await browser.close();
  }
}
