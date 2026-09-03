import { describe, it, expect } from "vitest";
import { GoogleMapsCollector } from "./google-maps";
import { YandexMapsCollector } from "./yandex-maps";
import { GeoapifyCollector } from "./geoapify";

const jsonResponse = (body: unknown): Response =>
  ({ ok: true, status: 200, json: async () => body }) as unknown as Response;

describe("GoogleMapsCollector", () => {
  it("skips (blocked) without an API key", async () => {
    const c = new GoogleMapsCollector({ apiKey: "" });
    const r = await c.run("dentistry", { cities: ["Ташкент"] });
    expect(r.blocked).toBe(true);
    expect(r.companies).toHaveLength(0);
  });

  it("parses places → normalized companies with geo", async () => {
    const fetchImpl = (async () =>
      jsonResponse({
        places: [
          {
            displayName: { text: "Дент Люкс" },
            internationalPhoneNumber: "+998 90 123 45 67",
            websiteUri: "http://dentlux.uz/",
            location: { latitude: 41.3, longitude: 69.2 },
            googleMapsUri: "https://maps.google.com/?cid=1",
          },
          { displayName: { text: "" } }, // dropped — no name
        ],
      })) as unknown as typeof fetch;
    const c = new GoogleMapsCollector({ apiKey: "k", fetchImpl, maxPages: 1 });
    const r = await c.run("dentistry", { cities: ["Ташкент"] });
    // 1 city × 2 keywords, each returns 1 valid place (empty-name one dropped).
    expect(r.companies).toHaveLength(2);
    expect(r.companies[0]).toMatchObject({
      name: "Дент Люкс",
      phone: "+998901234567",
      website: "https://dentlux.uz",
      source: "google",
      geo: { lat: 41.3, lng: 69.2 },
    });
  });
});

describe("YandexMapsCollector", () => {
  it("skips without key; parses features with key", async () => {
    expect((await new YandexMapsCollector({ apiKey: "" }).run("beauty", { cities: ["Ташкент"] })).blocked).toBe(true);

    const fetchImpl = (async () =>
      jsonResponse({
        features: [
          {
            geometry: { coordinates: [69.24, 41.31] },
            properties: {
              CompanyMetaData: {
                name: "Салон Роза",
                url: "roza.uz",
                Phones: [{ formatted: "+998 71 200 00 00" }],
              },
            },
          },
        ],
      })) as unknown as typeof fetch;
    const r = await new YandexMapsCollector({ apiKey: "k", fetchImpl }).run("beauty", { cities: ["Ташкент"] });
    // 1 city × 2 keywords → 2 features.
    expect(r.companies).toHaveLength(2);
    expect(r.companies[0]).toMatchObject({
      name: "Салон Роза",
      phone: "+998712000000",
      website: "https://roza.uz",
      source: "yandex",
      geo: { lat: 41.31, lng: 69.24 },
    });
  });
});

describe("GeoapifyCollector", () => {
  it("skips without key; skips unmapped industry; parses features", async () => {
    expect((await new GeoapifyCollector({ apiKey: "" }).run("dentistry")).blocked).toBe(true);
    expect((await new GeoapifyCollector({ apiKey: "k" }).run("no-such-industry")).blocked).toBe(true);

    const fetchImpl = (async () =>
      jsonResponse({
        features: [
          {
            properties: {
              name: "Стоматология OSM",
              contact: { phone: "+998 71 200 11 22" },
              website: "https://osm-dent.uz",
              lat: 41.3, lon: 69.24,
            },
          },
          { properties: { name: "" } }, // unnamed → dropped
        ],
      })) as unknown as typeof fetch;
    const r = await new GeoapifyCollector({ apiKey: "k", fetchImpl }).run("dentistry", { cities: ["Ташкент"] });
    expect(r.companies).toHaveLength(1);
    expect(r.companies[0]).toMatchObject({
      name: "Стоматология OSM",
      phone: "+998712001122",
      website: "https://osm-dent.uz",
      source: "geoapify",
      geo: { lat: 41.3, lng: 69.24 },
    });
  });
});
