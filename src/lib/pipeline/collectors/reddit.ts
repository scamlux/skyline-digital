import { fetchHtml } from "@/lib/radar/collectors/http";
import type { RawOpportunity } from "../types";
import { decodeEntities, parseBudget, toIso } from "./util";

/**
 * Reddit: публичный JSON сабреддитов (r/forhire, r/freelance_forhire).
 * Берём только посты заказчиков — «[Hiring]» в заголовке или флэре.
 * Reddit режет анонимные запросы с IP дата-центров, поэтому сборщик
 * best-effort: ошибка источника не валит прогон (см. run.ts).
 */

interface RedditChild {
  data?: {
    id?: string;
    title?: string;
    selftext?: string;
    permalink?: string;
    created_utc?: number;
    link_flair_text?: string | null;
    subreddit?: string;
  };
}

const HIRING = /\[\s*hiring\s*\]|^hiring\b/i;

export function parseReddit(payload: unknown): RawOpportunity[] {
  const children = (payload as { data?: { children?: RedditChild[] } })?.data?.children ?? [];
  const out: RawOpportunity[] = [];
  for (const c of children) {
    const d = c?.data;
    if (!d?.id || !d.title) continue;
    const isHiring = HIRING.test(d.title) || HIRING.test(d.link_flair_text ?? "");
    if (!isHiring) continue;
    const title = decodeEntities(d.title).trim();
    const description = decodeEntities(d.selftext ?? "").trim();
    const budget = parseBudget(`${title}\n${description}`);
    out.push({
      source: "reddit",
      externalId: d.id,
      url: d.permalink ? `https://www.reddit.com${d.permalink}` : null,
      title,
      description,
      budgetMin: budget?.min ?? null,
      budgetMax: budget?.max ?? null,
      currency: budget?.currency ?? null,
      publishedAt: toIso(d.created_utc),
      tags: [d.subreddit ? `r/${d.subreddit}` : "reddit"],
    });
  }
  return out;
}

export async function collectReddit(
  subreddits: string[],
  fetchImpl?: typeof fetch,
): Promise<RawOpportunity[]> {
  const out: RawOpportunity[] = [];
  for (const s of subreddits) {
    const res = await fetchHtml(`https://www.reddit.com/r/${encodeURIComponent(s)}/new.json?limit=50`, {
      fetchImpl,
      userAgent: "skyline-digital-pipeline/1.0 (+https://skyline-digital.uz)",
    });
    if (!res.ok) throw new Error(`reddit r/${s}: HTTP ${res.status}`);
    out.push(...parseReddit(JSON.parse(res.html)));
  }
  return out;
}
