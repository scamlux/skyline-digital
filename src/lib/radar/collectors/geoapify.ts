import type { Company, CollectorOptions, CollectorResult, Industry } from "../types";
import { normalizePhone, normalizeWebsite } from "../validate";
import { sleep } from "./http";

/**
 * Geoapify Places API collector (OSM-backed). Free tier ~3000 credits/day.
 * Reads GEOAPIFY_API_KEY; skips gracefully when absent.
 *
 * Searches by CATEGORY around city-center circles (Geoapify has no free-text
 * business search). OSM phone coverage in UZ is sparse — phoneless rows are
 * dropped at the store, and phone-bearing ones dedupe against Google by number
 * with Google ranked higher (SOURCE_RANK), so Google data always wins on clash.
 */

/** City centers (lon, lat) for circle filters. */
const CITY_CIRCLES: Record<string, [number, number]> = {
  Ташкент: [69.2401, 41.2995],
  Самарканд: [66.9597, 39.6542],
  Бухара: [64.4286, 39.7747],
  Наманган: [71.6726, 40.9983],
  Андижан: [72.3442, 40.7821],
  Фергана: [71.7843, 40.3834],
};

/** Industry key → Geoapify category. Unmapped industries are skipped. */
const CATEGORIES: Record<string, string> = {
  dentistry: "healthcare.dentist",
  auto: "service.vehicle.repair",
  beauty: "service.beauty",
  fitness: "sport.fitness.fitness_centre",
  restaurants: "catering.restaurant",
  cafes: "catering.cafe",
  barbershop: "service.beauty.hairdresser",
  medical: "healthcare.clinic_or_praxis",
  spa: "service.beauty.spa",
  education: "education",
  hotels: "accommodation.hotel",
  carwash: "service.vehicle.car_wash",
  veterinary: "pet.veterinary",
  lawyers: "office.lawyer",
  travel: "office.travel_agent",
  atelier: "service.tailor",
};

interface GeoapifyFeature {
  properties?: {
    name?: string;
    website?: string;
    phone?: string;
    contact?: { phone?: string };
    city?: string;
    lon?: number;
    lat?: number;
    place_id?: string;
  };
}

export class GeoapifyCollector {
  readonly source = "geoapify" as const;

  constructor(
    private readonly opts: { apiKey?: string; fetchImpl?: typeof fetch; limit?: number; radiusM?: number } = {},
  ) {}

  async run(industry: Industry, options: CollectorOptions = {}): Promise<CollectorResult> {
    const log = options.log ?? (() => {});
    const key = this.opts.apiKey ?? process.env.GEOAPIFY_API_KEY;
    if (!key) {
      log("[geoapify] GEOAPIFY_API_KEY not set — skipping");
      return { source: this.source, industry, companies: [], errors: ["no api key"], blocked: true };
    }
    const category = CATEGORIES[industry];
    if (!category) {
      log(`[geoapify] no category mapping for '${industry}' — skipping`);
      return { source: this.source, industry, companies: [], errors: [], blocked: true };
    }
    const doFetch = this.opts.fetchImpl ?? fetch;
    const limit = this.opts.limit ?? 100;
    const radius = this.opts.radiusM ?? 20000;
    const cities = options.cities?.filter((c) => CITY_CIRCLES[c]) ?? Object.keys(CITY_CIRCLES);
    const companies: Company[] = [];
    const errors: string[] = [];

    for (const city of cities) {
      const [lon, lat] = CITY_CIRCLES[city];
      const url = new URL("https://api.geoapify.com/v2/places");
      url.searchParams.set("categories", category);
      url.searchParams.set("filter", `circle:${lon},${lat},${radius}`);
      url.searchParams.set("limit", String(limit));
      url.searchParams.set("apiKey", key);
      try {
        const res = await doFetch(url.toString());
        if (!res.ok) {
          errors.push(`geoapify ${city}: HTTP ${res.status}`);
          continue;
        }
        const json = (await res.json()) as { features?: GeoapifyFeature[] };
        for (const f of json.features ?? []) {
          const p = f.properties ?? {};
          const name = p.name?.trim();
          if (!name) continue; // unnamed OSM nodes are useless as leads
          companies.push({
            name,
            phone: normalizePhone(p.contact?.phone ?? p.phone),
            industry,
            city,
            website: normalizeWebsite(p.website),
            email: null,
            socialLinks: [],
            source: this.source,
            sourceUrl: null,
            geo: p.lat != null && p.lon != null ? { lat: p.lat, lng: p.lon } : null,
          });
        }
        await sleep(300); // stay well under free-tier rate limits
      } catch (err) {
        errors.push(`geoapify ${city}: ${String(err)}`);
      }
    }
    log(`[geoapify] ${industry}: ${companies.length} raw`);
    return { source: this.source, industry, companies, errors };
  }
}
