import type { Company, CollectorOptions, CollectorResult, Industry } from "../types";
import { normalizePhone, normalizeWebsite } from "../validate";

/**
 * Yandex Maps "search for organizations" API collector — strong regional/CIS
 * coverage to complement Google. Reads YANDEX_MAPS_API_KEY; skips gracefully
 * when absent. GET https://search-maps.yandex.ru/v1/?type=biz → GeoJSON.
 */

const CITIES_UZ = ["Ташкент", "Самарканд", "Бухара", "Наманган", "Андижан", "Фергана"];

const KEYWORDS: Record<string, string[]> = {
  dentistry: ["стоматология", "зубной врач"],
  auto: ["автосервис", "автомастерская"],
  beauty: ["салон красоты", "парикмахерская"],
};

interface YandexFeature {
  geometry?: { coordinates?: [number, number] };
  properties?: {
    CompanyMetaData?: {
      name?: string;
      url?: string;
      address?: string;
      Phones?: { formatted?: string }[];
    };
  };
}

export class YandexMapsCollector {
  readonly source = "yandex" as const;

  constructor(
    private readonly opts: { apiKey?: string; fetchImpl?: typeof fetch; results?: number } = {},
  ) {}

  async run(industry: Industry, options: CollectorOptions = {}): Promise<CollectorResult> {
    const log = options.log ?? (() => {});
    const key = this.opts.apiKey ?? process.env.YANDEX_MAPS_API_KEY;
    if (!key) {
      log("[yandex] YANDEX_MAPS_API_KEY not set — skipping");
      return { source: this.source, industry, companies: [], errors: ["no api key"], blocked: true };
    }
    const doFetch = this.opts.fetchImpl ?? fetch;
    const cities = options.cities ?? CITIES_UZ;
    const results = this.opts.results ?? 50;
    const companies: Company[] = [];
    const errors: string[] = [];

    for (const city of cities) {
      for (const kw of (options.keywords ?? KEYWORDS[industry] ?? [industry])) {
        const url = new URL("https://search-maps.yandex.ru/v1/");
        url.searchParams.set("apikey", key);
        url.searchParams.set("text", `${kw} ${city}`);
        url.searchParams.set("type", "biz");
        url.searchParams.set("lang", "ru_RU");
        url.searchParams.set("results", String(results));
        try {
          const res = await doFetch(url.toString());
          if (!res.ok) {
            errors.push(`yandex ${city}/${kw}: HTTP ${res.status}`);
            continue;
          }
          const json = (await res.json()) as { features?: YandexFeature[] };
          for (const f of json.features ?? []) {
            const meta = f.properties?.CompanyMetaData;
            const name = meta?.name?.trim();
            if (!name) continue;
            const coords = f.geometry?.coordinates;
            companies.push({
              name,
              phone: normalizePhone(meta?.Phones?.[0]?.formatted),
              industry,
              city,
              website: normalizeWebsite(meta?.url),
              email: null,
              socialLinks: [],
              source: this.source,
              sourceUrl: null,
              geo: coords ? { lat: coords[1], lng: coords[0] } : null,
            });
          }
        } catch (err) {
          errors.push(`yandex ${city}/${kw}: ${String(err)}`);
        }
      }
    }
    log(`[yandex] ${industry}: ${companies.length} raw`);
    return { source: this.source, industry, companies, errors };
  }
}
