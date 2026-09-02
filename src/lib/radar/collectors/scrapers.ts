import type { Page } from "puppeteer-core";
import type { Company, CollectorOptions, Industry } from "../types";
import { normalizePhone, normalizeWebsite } from "../validate";
import { PuppeteerCollector, EXTRACT_CARDS } from "./puppeteer-collector";

/**
 * Puppeteer scrapers for the JS-rendered UZ directories. Per-site search/rubric
 * URLs feed the shared generic card extractor. Selectors/URLs are heuristic —
 * verify against live markup; the API collectors are the reliable primary.
 */

interface RawCard {
  name: string;
  phone: string;
  website: string | null;
}

async function scrapeUrls(
  self: PuppeteerCollector,
  page: Page,
  urls: string[],
  industry: Industry,
  source: Company["source"],
  opts: CollectorOptions,
): Promise<Company[]> {
  const log = opts.log ?? (() => {});
  const max = opts.maxResults ?? 200;
  const companies: Company[] = [];
  for (const url of urls) {
    if (companies.length >= max) break;
    await self.throttle();
    try {
      await page.goto(url, { waitUntil: "networkidle2", timeout: 30000 });
      await new Promise((r) => setTimeout(r, 2500)); // let the SPA hydrate
      // page.evaluate(string) evaluates an expression — wrap the arrow as an
      // IIFE so it's actually called and returns the array.
      const cards = (await page.evaluate(`(${EXTRACT_CARDS})()`)) as RawCard[];
      for (const c of cards) {
        const name = c.name?.trim();
        if (!name) continue;
        companies.push({
          name,
          phone: normalizePhone(c.phone),
          industry,
          city: null,
          website: normalizeWebsite(c.website),
          email: null,
          socialLinks: [],
          source,
          sourceUrl: url,
          geo: null,
        });
      }
      log(`  [${source}] ${url} → ${cards.length}`);
    } catch (err) {
      log(`  [${source}] ${url} failed: ${String(err)}`);
    }
  }
  return companies;
}

const KW: Record<Industry, string[]> = {
  dentistry: ["стоматология", "стоматолог"],
  auto: ["автосервис", "СТО"],
  beauty: ["салон красоты", "парикмахерская"],
};

const CITIES = ["tashkent", "samarkand", "bukhara"];

export class YellowpagesCollector extends PuppeteerCollector {
  readonly source = "yellowpages" as const;
  readonly origin = "https://www.yellowpages.uz";
  protected minDelayMs = 5000; // robots crawl-delay ~10 honoured via base
  private rubrics: Record<Industry, string[]> = {
    dentistry: [
      "/rubrika/detskaya-stomatologiya",
      "/rubrika/kruglosutochnaya-stomatologiya",
      "/rubrika/implantaciya-zubov",
      "/rubrika/bezboleznennoe-lechenie-zubov",
    ],
    auto: ["/razdel/avtomobili-i-transport", "/rubrika/avtoservis"],
    beauty: ["/rubrika/salony-krasoty-parikmaherskie"],
  };
  protected scrape(page: Page, industry: Industry, opts: CollectorOptions) {
    const urls = this.rubrics[industry].map((p) => this.origin + p);
    return scrapeUrls(this, page, urls, industry, this.source, opts);
  }
}

export class GigalCollector extends PuppeteerCollector {
  readonly source = "gigal" as const;
  readonly origin = "https://gigal.uz";
  protected minDelayMs = 1500;
  protected scrape(page: Page, industry: Industry, opts: CollectorOptions) {
    const urls = KW[industry].map((q) => `${this.origin}/search?query=${encodeURIComponent(q)}`);
    return scrapeUrls(this, page, urls, industry, this.source, opts);
  }
}

export class OlxCollector extends PuppeteerCollector {
  readonly source = "olx" as const;
  readonly origin = "https://www.olx.uz";
  protected minDelayMs = 2500;
  protected scrape(page: Page, industry: Industry, opts: CollectorOptions) {
    const urls = KW[industry].map((q) => `${this.origin}/list/q-${encodeURIComponent(q)}/`);
    return scrapeUrls(this, page, urls, industry, this.source, opts);
  }
}

export class TwoGisCollector extends PuppeteerCollector {
  readonly source = "2gis" as const;
  readonly origin = "https://2gis.uz";
  protected minDelayMs = 10000; // 2gis is sensitive — go slow
  protected scrape(page: Page, industry: Industry, opts: CollectorOptions) {
    const urls: string[] = [];
    for (const city of CITIES) {
      for (const q of KW[industry]) urls.push(`${this.origin}/${city}/search/${encodeURIComponent(q)}`);
    }
    return scrapeUrls(this, page, urls, industry, this.source, opts);
  }
}
