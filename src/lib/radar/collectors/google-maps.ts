import type { Company, CollectorOptions, CollectorResult, Industry } from "../types";
import { normalizePhone, normalizeWebsite } from "../validate";
import { sleep } from "./http";

/**
 * Google Places API (Text Search, v1) collector — the fastest, most reliable
 * source. Reads GOOGLE_MAPS_API_KEY from env; skips gracefully (no crash) when
 * absent. Sweeps major UZ cities × industry keywords, paginates via
 * nextPageToken.
 */

const CITIES_UZ = ["Ташкент", "Самарканд", "Бухара", "Наманган", "Андижан", "Фергана"];

/** Fallback keywords when the caller passes none (industries are dynamic). */
const KEYWORDS: Record<string, string[]> = {
  dentistry: ["dental clinic", "dentist"],
  auto: ["auto service", "car repair"],
  beauty: ["beauty salon", "hair salon"],
};

interface GooglePlace {
  displayName?: { text?: string };
  internationalPhoneNumber?: string;
  nationalPhoneNumber?: string;
  websiteUri?: string;
  location?: { latitude: number; longitude: number };
  googleMapsUri?: string;
}

export class GoogleMapsCollector {
  readonly source = "google" as const;

  constructor(
    private readonly opts: { apiKey?: string; fetchImpl?: typeof fetch; maxPages?: number } = {},
  ) {}

  async run(industry: Industry, options: CollectorOptions = {}): Promise<CollectorResult> {
    const log = options.log ?? (() => {});
    const key = this.opts.apiKey ?? process.env.GOOGLE_MAPS_API_KEY;
    if (!key) {
      log("[google] GOOGLE_MAPS_API_KEY not set — skipping");
      return { source: this.source, industry, companies: [], errors: ["no api key"], blocked: true };
    }
    const doFetch = this.opts.fetchImpl ?? fetch;
    const cities = options.cities ?? CITIES_UZ;
    const keywords = options.keywords ?? KEYWORDS[industry] ?? [industry];
    const maxPages = this.opts.maxPages ?? 3;
    const companies: Company[] = [];
    const errors: string[] = [];

    for (const city of cities) {
      for (const kw of keywords) {
        let pageToken: string | undefined;
        let pages = 0;
        do {
          try {
            const res = await doFetch("https://places.googleapis.com/v1/places:searchText", {
              method: "POST",
              headers: {
                "content-type": "application/json",
                "X-Goog-Api-Key": key,
                "X-Goog-FieldMask":
                  "places.displayName,places.internationalPhoneNumber,places.nationalPhoneNumber,places.websiteUri,places.location,places.googleMapsUri,nextPageToken",
              },
              body: JSON.stringify({
                textQuery: `${kw} in ${city}, Uzbekistan`,
                languageCode: "ru",
                regionCode: "UZ",
                ...(pageToken ? { pageToken } : {}),
              }),
            });
            if (!res.ok) {
              errors.push(`google ${city}/${kw}: HTTP ${res.status}`);
              break;
            }
            const json = (await res.json()) as { places?: GooglePlace[]; nextPageToken?: string };
            for (const p of json.places ?? []) {
              const name = p.displayName?.text?.trim();
              if (!name) continue;
              companies.push({
                name,
                phone: normalizePhone(p.internationalPhoneNumber ?? p.nationalPhoneNumber),
                industry,
                city,
                website: normalizeWebsite(p.websiteUri),
                email: null,
                socialLinks: [],
                source: this.source,
                sourceUrl: p.googleMapsUri ?? null,
                geo: p.location ? { lat: p.location.latitude, lng: p.location.longitude } : null,
              });
            }
            pageToken = json.nextPageToken;
            pages++;
            if (pageToken) await sleep(2000); // token needs a moment to become valid
          } catch (err) {
            errors.push(`google ${city}/${kw}: ${String(err)}`);
            break;
          }
        } while (pageToken && pages < maxPages);
      }
    }
    log(`[google] ${industry}: ${companies.length} raw`);
    return { source: this.source, industry, companies, errors };
  }
}
