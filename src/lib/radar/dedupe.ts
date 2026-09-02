import type { Company, RadarSource } from "./types";

/**
 * Deduplication by phone (strong key) with a fuzzy name+city fallback.
 * Deterministic and pure. See docs/adr/0002-radar-engine.md.
 */

/** Legal-form tokens dropped from names (JS \b doesn't work on Cyrillic). */
const LEGAL_FORMS = new Set([
  "ооо", "оао", "зао", "чп", "ип", "llc", "ltd", "inc", "mchj", "xk", "yatt",
]);

/** Lowercase, drop punctuation and legal-form noise, collapse whitespace. */
export function normalizeCompanyName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[«»"'`’.,()[\]]/g, " ")
    .split(/\s+/)
    .filter((w) => w && !LEGAL_FORMS.has(w))
    .join(" ")
    .trim();
}

/** Classic Levenshtein edit distance. */
export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const curr = [i];
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(curr[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
    }
    prev = curr;
  }
  return prev[b.length];
}

/** Name similarity in [0,1] after normalisation. */
export function similarity(a: string, b: string): number {
  const A = normalizeCompanyName(a);
  const B = normalizeCompanyName(b);
  if (!A && !B) return 1;
  const m = Math.max(A.length, B.length);
  if (m === 0) return 1;
  return 1 - levenshtein(A, B) / m;
}

function sameCity(a: string | null, b: string | null): boolean {
  if (!a || !b) return true; // unknown city shouldn't block an otherwise-strong match
  return normalizeCompanyName(a) === normalizeCompanyName(b);
}

/**
 * Two records are the same business when their phones match, or (when a phone
 * is missing on either side) when the names are ≥85% similar in the same city.
 * Two *different* confirmed phones are treated as distinct contactable leads.
 */
export function isDuplicate(c1: Company, c2: Company, threshold = 0.85): boolean {
  if (c1.phone && c2.phone) return c1.phone === c2.phone;
  return sameCity(c1.city, c2.city) && similarity(c1.name, c2.name) >= threshold;
}

/** Higher rank = more trusted/complete source, wins field conflicts. */
const SOURCE_RANK: Record<RadarSource, number> = {
  yellowpages: 5,
  "2gis": 4,
  gigal: 3,
  pc: 2,
  olx: 1,
};

export function mergeCompanies(a: Company, b: Company): Company {
  const [primary, secondary] =
    SOURCE_RANK[a.source] >= SOURCE_RANK[b.source] ? [a, b] : [b, a];
  return {
    ...primary,
    phone: primary.phone ?? secondary.phone,
    website: primary.website ?? secondary.website,
    email: primary.email ?? secondary.email,
    city: primary.city ?? secondary.city,
    geo: primary.geo ?? secondary.geo,
    sourceUrl: primary.sourceUrl ?? secondary.sourceUrl,
    socialLinks: Array.from(
      new Set([...(primary.socialLinks ?? []), ...(secondary.socialLinks ?? [])]),
    ),
  };
}

/** Collapse duplicates, merging their fields. Greedy single-pass clustering. */
export function dedupe(companies: Company[]): Company[] {
  const clusters: Company[] = [];
  for (const c of companies) {
    const idx = clusters.findIndex((x) => isDuplicate(x, c));
    if (idx === -1) clusters.push(c);
    else clusters[idx] = mergeCompanies(clusters[idx], c);
  }
  return clusters;
}
