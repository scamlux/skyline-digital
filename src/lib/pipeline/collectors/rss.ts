import { createHash } from "node:crypto";
import { fetchHtml } from "@/lib/radar/collectors/http";
import type { RawOpportunity } from "../types";
import { htmlToText, parseBudget, toIso } from "./util";

/**
 * Универсальная RSS 2.0 / Atom лента. Покрывает всё, что отдаёт фид:
 * биржи (FL.ru, Weblancer), закупки (AIIB, UNDP), агрегаторы тендеров,
 * Google Alerts в RSS-режиме. Ленты задаются в PIPELINE_RSS_FEEDS.
 */

const tag = (xml: string, name: string): string | null => {
  const m = new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`, "i").exec(xml);
  return m ? m[1] : null;
};

export function parseFeed(xml: string, feedUrl: string): RawOpportunity[] {
  const host = (() => {
    try {
      return new URL(feedUrl).hostname.replace(/^www\./, "");
    } catch {
      return "rss";
    }
  })();
  const items = xml.match(/<item[\s>][\s\S]*?<\/item>/gi) ?? xml.match(/<entry[\s>][\s\S]*?<\/entry>/gi) ?? [];
  const out: RawOpportunity[] = [];
  for (const it of items) {
    const title = htmlToText(tag(it, "title") ?? "");
    if (!title) continue;
    const link =
      htmlToText(tag(it, "link") ?? "") ||
      /<link[^>]+href="([^"]+)"/i.exec(it)?.[1] ||
      null;
    const body = htmlToText(
      tag(it, "description") ?? tag(it, "content:encoded") ?? tag(it, "summary") ?? tag(it, "content") ?? "",
    );
    const guid = htmlToText(tag(it, "guid") ?? tag(it, "id") ?? "") || link || title;
    const budget = parseBudget(`${title}\n${body}`);
    out.push({
      source: "rss",
      // host + guid: одинаковые guid в разных лентах не склеиваются.
      externalId: `${host}:${createHash("sha1").update(guid).digest("hex").slice(0, 16)}`,
      url: link,
      title,
      description: body,
      budgetMin: budget?.min ?? null,
      budgetMax: budget?.max ?? null,
      currency: budget?.currency ?? null,
      publishedAt: toIso(tag(it, "pubDate") ?? tag(it, "published") ?? tag(it, "updated")),
      tags: [host],
    });
  }
  return out;
}

export async function collectRss(feeds: string[], fetchImpl?: typeof fetch): Promise<RawOpportunity[]> {
  const out: RawOpportunity[] = [];
  for (const f of feeds) {
    const res = await fetchHtml(f, { fetchImpl });
    if (!res.ok) throw new Error(`rss ${f}: HTTP ${res.status}`);
    out.push(...parseFeed(res.html, f));
  }
  return out;
}
