/**
 * Phone / website normalisation and validation for radar leads.
 * Pure and deterministic — used by every collector and the store.
 */

/**
 * Normalise an Uzbek phone to canonical `+998XXXXXXXXX`, or null if the input
 * can't be a valid UZ number. Accepts messy directory formats: `+998 90 123 45
 * 67`, `(90) 123-45-67`, `901234567`, `998901234567`.
 */
export function normalizePhone(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const d = raw.replace(/\D/g, "");
  if (d.length === 12 && d.startsWith("998")) return "+" + d;
  if (d.length === 9) return "+998" + d;
  // Some listings prefix a trunk 0 before the 9-digit national number.
  if (d.length === 10 && d.startsWith("0")) return "+998" + d.slice(1);
  return null;
}

export function isValidUzPhone(raw: string | null | undefined): boolean {
  return normalizePhone(raw) !== null;
}

/** Social/aggregator hosts that are NOT a company's own website. */
const SOCIAL_HOSTS = [
  "instagram.com",
  "facebook.com",
  "t.me",
  "telegram.me",
  "youtube.com",
  "tiktok.com",
  "twitter.com",
  "x.com",
  "linkedin.com",
  // Aggregators / free builders: a listing or a third-party page, not a site the
  // company owns — auditing it says nothing about the business.
  "booking.com",
  "agoda.com",
  "tripadvisor.com",
  "sites.google.com",
  "taplink.cc",
  "linktr.ee",
  "2gis.uz",
  "2gis.ru",
  "yandex.uz",
  "yandex.ru",
  "google.com",
  "goo.gl",
  "wa.me",
];

export function isSocialHost(host: string): boolean {
  const h = host.replace(/^www\./, "").toLowerCase();
  return SOCIAL_HOSTS.some((s) => h === s || h.endsWith("." + s));
}

/**
 * Normalise a website to an absolute `https://host[/path]`, or null when the
 * value isn't a real external site (empty, no dot in host, or a social link).
 */
export function normalizeWebsite(raw: string | null | undefined): string | null {
  if (!raw) return null;
  // Directories sometimes join several sites with ";", "," or spaces — keep the
  // first real one ("unigeo.uz/;https://pisa.uz" broke the audit as one URL).
  const parts = raw.split(/[;,\s]+/).filter(Boolean);
  if (parts.length > 1) {
    for (const p of parts) {
      const n = normalizeWebsite(p);
      if (n) return n;
    }
    return null;
  }
  let s = raw.trim();
  if (!s) return null;
  if (!/^https?:\/\//i.test(s)) s = "https://" + s;
  try {
    const u = new URL(s);
    const host = u.hostname.toLowerCase();
    if (!host.includes(".")) return null;
    if (isSocialHost(host)) return null;
    const path = u.pathname === "/" ? "" : u.pathname.replace(/\/$/, "");
    return `https://${host.replace(/^www\./, "")}${path}`;
  } catch {
    return null;
  }
}

export function hostOf(url: string | null | undefined): string | null {
  const n = normalizeWebsite(url);
  if (!n) return null;
  try {
    return new URL(n).hostname;
  } catch {
    return null;
  }
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export function normalizeEmail(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const e = raw.trim().toLowerCase();
  return EMAIL_RE.test(e) ? e : null;
}
