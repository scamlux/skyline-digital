import { fetchHtml } from "@/lib/radar/collectors/http";
import type { RawOpportunity } from "../types";
import { htmlToText, toIso } from "./util";

/**
 * World Bank Procurement Notices API — официальный публичный JSON без ключа.
 * Ловит REOI индивидуальных консультантов и фирм в PIU проектов Банка
 * (приложение D исследования: «канал №1 для одного человека»).
 *
 * Формат ответа проверить из окружения разработки не удалось (сеть закрыта),
 * поэтому парсер терпим к отсутствующим полям и фильтрует страну сам —
 * даже если API проигнорирует параметр страны.
 */

interface WbNotice {
  id?: string;
  notice_type?: string;
  notice_title?: string;
  bid_description?: string;
  project_name?: string;
  project_ctry_name?: string;
  noticedate?: string;
  submission_deadline_date?: string;
  submission_date?: string;
  procurement_method_name?: string;
}

export function worldbankUrl(country: string, rows = 100): string {
  const u = new URL("https://search.worldbank.org/api/v2/procnotices");
  u.searchParams.set("format", "json");
  u.searchParams.set("rows", String(rows));
  u.searchParams.set("apilang", "en");
  u.searchParams.set("srt", "noticedate");
  u.searchParams.set("order", "desc");
  u.searchParams.set("project_ctry_name", country);
  return u.toString();
}

export function parseWorldbank(payload: unknown, country: string): RawOpportunity[] {
  const list = (payload as { procnotices?: unknown })?.procnotices;
  const items: WbNotice[] = Array.isArray(list)
    ? (list as WbNotice[])
    : list && typeof list === "object"
      ? (Object.values(list) as WbNotice[])
      : [];
  const want = country.toLowerCase();
  const out: RawOpportunity[] = [];
  for (const n of items) {
    if (!n?.id) continue;
    if (n.project_ctry_name && !n.project_ctry_name.toLowerCase().includes(want)) continue;
    const title = (n.notice_title || n.bid_description || n.project_name || "").trim();
    if (!title) continue;
    const description = [
      n.notice_type,
      n.procurement_method_name,
      n.project_name ? `Project: ${n.project_name}` : "",
      n.bid_description ? htmlToText(n.bid_description) : "",
    ]
      .filter(Boolean)
      .join("\n");
    out.push({
      source: "worldbank",
      externalId: n.id,
      url: `https://projects.worldbank.org/en/projects-operations/procurement-detail/${n.id}`,
      title,
      description,
      buyer: n.project_name ?? null,
      country: n.project_ctry_name ?? country,
      deadline: toIso(n.submission_deadline_date || n.submission_date),
      publishedAt: toIso(n.noticedate),
      tags: [n.notice_type, n.procurement_method_name].filter((t): t is string => Boolean(t)),
    });
  }
  return out;
}

export async function collectWorldbank(
  countries: string[],
  fetchImpl?: typeof fetch,
): Promise<RawOpportunity[]> {
  const out: RawOpportunity[] = [];
  for (const c of countries) {
    const res = await fetchHtml(worldbankUrl(c), { fetchImpl });
    if (!res.ok) throw new Error(`worldbank ${c}: HTTP ${res.status}`);
    out.push(...parseWorldbank(JSON.parse(res.html), c));
  }
  return out;
}
