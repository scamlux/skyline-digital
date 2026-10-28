/**
 * Pure helpers for the outreach CSV export (scripts/audit/outreach-export.ts):
 * channel extraction from social links, RFC4180 CSV, email junk filter.
 */

export interface Channels {
  telegram: string;
  whatsapp: string;
}

/** First t.me / wa.me link found among social links (empty string if none). */
export function extractChannels(links: readonly string[] | null | undefined): Channels {
  const out: Channels = { telegram: "", whatsapp: "" };
  for (const raw of links ?? []) {
    if (typeof raw !== "string") continue;
    const l = raw.trim();
    if (!out.telegram && /^https?:\/\/(www\.)?(t\.me|telegram\.me)\/[^\s/]+/i.test(l)) out.telegram = l;
    else if (!out.whatsapp && /^https?:\/\/(www\.)?(wa\.me|api\.whatsapp\.com)\/\S+/i.test(l)) out.whatsapp = l;
  }
  return out;
}

const JUNK_EMAIL = /\.(png|jpe?g|gif|svg|webp|css|js)$|^(example|test|name|email|user|your)@|@(example|domain|email|test|sentry)\.|^(noreply|no-reply)@/i;

/** True for plausible mailbox, false for images/placeholders/noreply. */
export function isUsableEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const e = email.trim();
  return /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(e) && !JUNK_EMAIL.test(e);
}

/** RFC4180 field quoting. */
export function csvField(v: unknown): string {
  const s = v == null ? "" : String(v);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** Rows to CSV text: UTF-8 BOM (Excel + Cyrillic), CRLF line endings. */
export function toCsv(header: readonly string[], rows: readonly (readonly unknown[])[]): string {
  const lines = [header, ...rows].map((r) => r.map(csvField).join(","));
  return "﻿" + lines.join("\r\n") + "\r\n";
}

/**
 * Domains NOT worth a personal pitch: international chains (decisions are made
 * at head office, not by the Tashkent branch) and page builders that are not
 * company sites. Matches the domain itself and any subdomain, by website host
 * OR email domain. Edit freely.
 */
export const OUTREACH_BLOCKLIST: readonly string[] = [
  "ihg.com",
  "wyndham.com",
  "sixt.com",
  "sixt.uz",
  "codingninjas.com",
  "marriott.com",
  "hilton.com",
  "hyatt.com",
  "accor.com",
  "radissonhotels.com",
  "gamma.site", // page builder, not a company site (tilda.ws is fine)
];

/** Lowercased host without "www.", or "" if unparsable. */
export function hostOf(website: string | null | undefined): string {
  if (!website) return "";
  try {
    const u = new URL(/^https?:\/\//i.test(website.trim()) ? website.trim() : `https://${website.trim()}`);
    return u.hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return "";
  }
}

export function emailDomain(email: string | null | undefined): string {
  const i = email ? email.lastIndexOf("@") : -1;
  return i < 0 ? "" : email!.slice(i + 1).trim().toLowerCase();
}

function inList(domain: string, list: readonly string[]): boolean {
  return !!domain && list.some((d) => domain === d || domain.endsWith(`.${d}`));
}

export function isBlocked(
  website: string | null | undefined,
  email: string | null | undefined,
  list: readonly string[] = OUTREACH_BLOCKLIST,
): boolean {
  return inList(hostOf(website), list) || inList(emailDomain(email), list);
}

export interface DedupeItem {
  name: string;
  score: number;
  host: string;
  email: string;
}
export interface DedupeResult<T> {
  row: T;
  branches: number;
  branchNames: string[];
}

/**
 * Merge rows sharing a website host OR an email (transitively). Keeps the
 * worst (lowest) score per group; ties keep the first.
 */
export function dedupe<T extends DedupeItem>(items: readonly T[]): DedupeResult<T>[] {
  const parent = items.map((_, i) => i);
  const find = (i: number): number => (parent[i] === i ? i : (parent[i] = find(parent[i])));
  const seen = new Map<string, number>();
  items.forEach((it, i) => {
    for (const k of [it.host && `h:${it.host}`, it.email && `e:${it.email.toLowerCase()}`]) {
      if (!k) continue;
      const j = seen.get(k);
      if (j === undefined) seen.set(k, i);
      else parent[find(i)] = find(j);
    }
  });
  const groups = new Map<number, number[]>();
  items.forEach((_, i) => {
    const r = find(i);
    groups.set(r, [...(groups.get(r) ?? []), i]);
  });
  return [...groups.values()].map((idx) => {
    const best = idx.reduce((a, b) => (items[b].score < items[a].score ? b : a));
    return { row: items[best], branches: idx.length, branchNames: idx.slice(0, 3).map((i) => items[i].name) };
  });
}

const CYR: Record<string, string> = {
  а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "e", ж: "zh", з: "z", и: "i", й: "y", к: "k", л: "l", м: "m",
  н: "n", о: "o", п: "p", р: "r", с: "s", т: "t", у: "u", ф: "f", х: "kh", ц: "ts", ч: "ch", ш: "sh", щ: "sh",
  ъ: "", ы: "y", ь: "", э: "e", ю: "yu", я: "ya", ў: "u", қ: "q", ғ: "g", ҳ: "h",
};

/** Lowercase, Cyrillic→Latin, only a-z0-9 and separators. */
function latin(s: string): string {
  return s.toLowerCase().replace(/[а-яёўқғҳ]/g, (c) => CYR[c] ?? "");
}

const STOP = new Set(["www", "com", "the", "uz", "org", "net", "info", "hotel", "hotels", "tashkent", "toshkent", "samarkand", "bukhara", "official", "group", "llc", "ooo", "center", "centre"]);

function tokens(s: string): string[] {
  return latin(s).split(/[^a-z0-9]+/).filter((t) => t.length >= 3 && !STOP.has(t));
}

/** Handle from an instagram.com / t.me URL (or bare @handle), lowercased. */
export function handleOf(url: string | null | undefined): string {
  if (!url) return "";
  const m = url.trim().match(/(?:instagram\.com|t\.me|telegram\.me)\/@?([A-Za-z0-9_.]+)/i) ?? url.trim().match(/^@([A-Za-z0-9_.]+)$/);
  return m ? m[1].toLowerCase() : "";
}

/**
 * Heuristic: "match" if any ≥3-char token of the name/host is inside a handle
 * or vice versa. Returns true when every given handle looks unrelated.
 * No handles → false (nothing to check).
 */
export function contactLooksOff(name: string, host: string, handles: readonly string[]): boolean {
  const hs = handles.map((h) => latin(h).replace(/[^a-z0-9]/g, "")).filter(Boolean);
  if (!hs.length) return false;
  const toks = [...tokens(name), ...tokens(host.replace(/\.[a-z.]+$/, ""))];
  const matches = (h: string) => toks.some((t) => h.includes(t) || (h.length >= 3 && t.includes(h)));
  return !hs.some(matches);
}
