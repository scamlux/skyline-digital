import type { CollectorOptions, CollectorResult, Industry, RadarSource } from "./types";
import { GoogleMapsCollector } from "./collectors/google-maps";
import { YandexMapsCollector } from "./collectors/yandex-maps";
import { GeoapifyCollector } from "./collectors/geoapify";
import {
  YellowpagesCollector,
  GigalCollector,
  OlxCollector,
  TwoGisCollector,
} from "./collectors/scrapers";

/** Anything that can produce companies for an industry. */
export interface RadarCollector {
  readonly source: RadarSource;
  run(industry: Industry, opts?: CollectorOptions): Promise<CollectorResult>;
}

/** API collectors are cheap/reliable; scrapers are heavier (Puppeteer). */
export const API_SOURCES: RadarSource[] = ["google", "yandex", "geoapify"];
export const SCRAPER_SOURCES: RadarSource[] = ["yellowpages", "gigal", "olx", "2gis"];

export function createCollector(source: RadarSource): RadarCollector | null {
  switch (source) {
    case "google":
      return new GoogleMapsCollector();
    case "yandex":
      return new YandexMapsCollector();
    case "geoapify":
      return new GeoapifyCollector();
    case "yellowpages":
      return new YellowpagesCollector();
    case "gigal":
      return new GigalCollector();
    case "olx":
      return new OlxCollector();
    case "2gis":
      return new TwoGisCollector();
    default:
      return null;
  }
}
