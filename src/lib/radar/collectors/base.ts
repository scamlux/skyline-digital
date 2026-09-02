import type {
  Company,
  CollectorOptions,
  CollectorResult,
  Industry,
  RadarSource,
} from "../types";
import { fetchRobots, isPathAllowed, type RobotsRules } from "./robots";
import { sleep } from "./http";

export interface CollectorConfig {
  origin: string; // e.g. https://pc.uz
  minDelayMs: number; // floor throttle between requests
  userAgent?: string;
}

/**
 * Base collector: robots.txt gating, adaptive rate limiting (honours the larger
 * of the configured floor and robots Crawl-delay), logging, and error
 * isolation — a throwing `collect` becomes an empty result with the error
 * recorded, never a crash (docs/adr/0002-radar-engine.md).
 */
export abstract class Collector {
  abstract readonly source: RadarSource;
  private robots: RobotsRules | null = null;
  private lastRequestAt = 0;

  constructor(
    protected readonly cfg: CollectorConfig,
    protected readonly log: (m: string) => void = () => {},
  ) {}

  protected abstract collect(industry: Industry, opts: CollectorOptions): Promise<Company[]>;

  protected async ensureRobots(): Promise<RobotsRules> {
    this.robots ??= await fetchRobots(this.cfg.origin, this.cfg.userAgent);
    return this.robots;
  }

  /** Space out requests by max(floor, robots crawl-delay). */
  protected async throttle(): Promise<void> {
    const crawl = this.robots?.crawlDelaySec ? this.robots.crawlDelaySec * 1000 : 0;
    const delay = Math.max(this.cfg.minDelayMs, crawl);
    const wait = this.lastRequestAt + delay - Date.now();
    if (wait > 0) await sleep(wait);
    this.lastRequestAt = Date.now();
  }

  protected allowed(path: string): boolean {
    return this.robots ? isPathAllowed(this.robots, path) : true;
  }

  async run(industry: Industry, opts: CollectorOptions = {}): Promise<CollectorResult> {
    const l = opts.log ?? this.log;
    try {
      const robots = await this.ensureRobots();
      if (robots.blocksEverything) {
        l(`[${this.source}] robots.txt disallows all — skipping ${industry}`);
        return { source: this.source, industry, companies: [], errors: ["robots: Disallow /"], blocked: true };
      }
      const companies = await this.collect(industry, opts);
      l(`[${this.source}] ${industry}: collected ${companies.length}`);
      return { source: this.source, industry, companies, errors: [] };
    } catch (err) {
      l(`[${this.source}] FATAL ${String(err)}`);
      return { source: this.source, industry, companies: [], errors: [String(err)] };
    }
  }
}

/** Industry → localized search keyword(s) shared by keyword-search collectors. */
export const INDUSTRY_KEYWORDS: Record<Industry, string[]> = {
  dentistry: ["стоматология", "стоматолог", "dental"],
  auto: ["автосервис", "авторемонт", "СТО"],
  beauty: ["салон красоты", "beauty", "парикмахерская"],
};
