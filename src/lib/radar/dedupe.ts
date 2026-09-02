import type { Company, RadarSource } from "./types";

/**
 * Deduplication by phone (strong key) with a strict name+city fallback
 * (docs/radar/IMPLEMENTATION.md): phone match on the last 10 digits, else same
 * normalised first word AND Levenshtein ≤ 1 AND ≤ 3 char length difference AND
 * (cities unknown or equal). Deliberately conservative — better a rare missed
 * merge than collapsing two different clinics.
 */

/** Legal-form tokens dropped from names (JS \b doesn't work on Cyrillic). */
const LEGAL_FORMS = new Set([
  "ооо", "оао", "зао", "чп", "ип", "llc", "ltd", "inc", "mchj", "xk", "yatt",
]);

/** Lowercase, split on punctuation/hyphens, drop legal-form noise, collapse. */
export function normalizeCompanyName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[«»"'`’.,()[\]/\\-]/g, " ")
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

/** Similarity in [0,1] after normalisation (exposed for diagnostics). */
export function similarity(a: string, b: string): number {
  const A = normalizeCompanyName(a);
  const B = normalizeCompanyName(b);
  const m = Math.max(A.length, B.length);
  return m === 0 ? 1 : 1 - levenshtein(A, B) / m;
}

/** Last 10 significant digits of a phone, or null when too short. */
export function last10(phone: string | null): string | null {
  const d = (phone ?? "").replace(/\D/g, "");
  return d.length >= 10 ? d.slice(-10) : null;
}

export function isDuplicate(c1: Company, c2: Company): boolean {
  const p1 = last10(c1.phone);
  const p2 = last10(c2.phone);
  if (p1 && p2) return p1 === p2;

  const n1 = normalizeCompanyName(c1.name);
  const n2 = normalizeCompanyName(c2.name);
  if (!n1 || !n2) return false;
  if (n1.split(" ")[0] !== n2.split(" ")[0]) return false; // same first word
  if (Math.abs(n1.length - n2.length) > 3) return false; // ≤3 char length diff
  if (levenshtein(n1, n2) > 1) return false; // ≤1 edit
  if (c1.city && c2.city && normalizeCompanyName(c1.city) !== normalizeCompanyName(c2.city)) {
    return false; // both cities known and different
  }
  return true;
}

/** Higher rank = more trusted/complete source, wins field conflicts. */
const SOURCE_RANK: Record<RadarSource, number> = {
  google: 6,
  yandex: 5,
  yellowpages: 4,
  gigal: 3,
  "2gis": 2,
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
