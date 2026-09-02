import type { Browser, Page } from "puppeteer-core";
import { launchBrowser } from "../../browser";
import type { Company, CollectorOptions, CollectorResult, Industry, RadarSource } from "../types";
import { fetchRobots } from "./robots";
import { sleep, pickUserAgent } from "./http";

/**
 * Base for Puppeteer-driven scrapers. Handles robots gating, UA, a rate-limit
 * throttle, and — critically — always closes the browser (no zombie processes),
 * turning any scrape error into an empty result rather than a crash.
 *
 * NOTE: the concrete scrapers target JS-rendered directory SPAs; their in-page
 * selectors are heuristic and may need tuning against the live markup. The API
 * collectors (google/yandex) are the reliable primary source.
 */
export abstract class PuppeteerCollector {
  abstract readonly source: RadarSource;
  abstract readonly origin: string;
  protected minDelayMs = 4000;
  private lastAt = 0;

  protected abstract scrape(
    page: Page,
    industry: Industry,
    opts: CollectorOptions,
  ): Promise<Company[]>;

  async throttle(delay = this.minDelayMs): Promise<void> {
    const wait = this.lastAt + delay - Date.now();
    if (wait > 0) await sleep(wait);
    this.lastAt = Date.now();
  }

  async run(industry: Industry, opts: CollectorOptions = {}): Promise<CollectorResult> {
    const log = opts.log ?? (() => {});
    let robots = null;
    try {
      robots = await fetchRobots(this.origin, pickUserAgent());
    } catch {
      /* fetch failure → treat as allowed */
    }
    if (robots?.blocksEverything) {
      log(`[${this.source}] robots.txt disallows all — skipping ${industry}`);
      return { source: this.source, industry, companies: [], errors: ["robots: Disallow /"], blocked: true };
    }

    let browser: Browser | null = null;
    try {
      browser = await launchBrowser();
      const page = await browser.newPage();
      await page.setUserAgent(pickUserAgent());
      await page.setViewport({ width: 1366, height: 900 });
      const companies = await this.scrape(page, industry, opts);
      log(`[${this.source}] ${industry}: ${companies.length} raw`);
      return { source: this.source, industry, companies, errors: [] };
    } catch (err) {
      log(`[${this.source}] FATAL ${String(err)}`);
      return { source: this.source, industry, companies: [], errors: [String(err)] };
    } finally {
      if (browser) await browser.close().catch(() => {});
    }
  }
}

/**
 * Generic in-page card extractor, stringified for page.evaluate. Finds elements
 * holding a UZ phone, climbs to a plausible card container, and reads a name,
 * website and phone from it. Deliberately source-agnostic — good enough to
 * bootstrap; refine per-site as needed.
 */
export const EXTRACT_CARDS = `() => {
  const PHONE = /(?:\\+998|998|8)?[\\s(\\-]?\\d{2}[\\s)\\-]?\\d{3}[\\s\\-]?\\d{2}[\\s\\-]?\\d{2}/g;
  const SOCIAL = /instagram\\.com|facebook\\.com|t\\.me|telegram\\.me/;
  const out = [];
  const seen = new Set();
  const nodes = Array.from(document.querySelectorAll('a[href^="tel:"], [href*="tel:"]'));
  const anchors = new Set();
  for (const n of nodes) {
    let card = n;
    for (let i = 0; i < 6 && card.parentElement; i++) {
      card = card.parentElement;
      if (card.querySelector('h1,h2,h3,h4,a[href]')) break;
    }
    if (anchors.has(card)) continue;
    anchors.add(card);
    const text = card.textContent || '';
    const phoneM = (n.getAttribute('href') || '').replace('tel:', '') || (text.match(PHONE) || [])[0] || '';
    const heading = card.querySelector('h1,h2,h3,h4,strong,a[href]');
    const name = heading ? (heading.textContent || '').trim().slice(0, 120) : '';
    let website = null;
    for (const a of Array.from(card.querySelectorAll('a[href^="http"]'))) {
      const href = a.getAttribute('href') || '';
      if (!href.includes(location.hostname) && !SOCIAL.test(href)) { website = href; break; }
    }
    if (!name) continue;
    const key = name + '|' + phoneM;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ name, phone: phoneM, website });
  }
  return out;
}`;
