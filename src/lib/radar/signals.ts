import type { Company, Signals, WebStatus } from "./types";
import { baseSignals } from "./score";
import { normalizeEmail, normalizeWebsite } from "./validate";

/**
 * Signal extraction + timeout-safe website enrichment.
 *
 * Enrichment never throws: any fetch failure/timeout downgrades to a webStatus
 * and the company still gets scored from whatever signals were collected. The
 * result feeds the pure {@link scoreCompany}, so grading stays deterministic.
 */

const EMAIL_RE = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi;
const SOCIAL_RE =
  /https?:\/\/(?:www\.)?(?:instagram\.com|facebook\.com|t\.me|telegram\.me|youtube\.com|tiktok\.com)\/[^\s"'<>)]+/gi;

// CTA phrases (ru/uz/en) that indicate a conversion-ready site.
const CTA_WORDS = [
  "запис", "позвони", "закажи", "заказать", "оставить заявку", "купить", "корзин",
  "book", "appointment", "call now", "order", "buy", "contact us",
  "yozilish", "buyurtma", "aloqa",
];

export function extractEmails(html: string): string[] {
  const found = new Set<string>();
  for (const m of html.matchAll(EMAIL_RE)) {
    const e = normalizeEmail(m[0]);
    // skip asset filenames that look like emails only rarely; keep it simple
    if (e && !e.endsWith(".png") && !e.endsWith(".jpg")) found.add(e);
  }
  return [...found];
}

export function extractSocials(html: string): string[] {
  const found = new Set<string>();
  for (const m of html.matchAll(SOCIAL_RE)) found.add(m[0].replace(/[.,)]+$/, ""));
  return [...found];
}

export function hasCtaText(html: string): boolean {
  const lower = html.toLowerCase();
  return CTA_WORDS.some((w) => lower.includes(w));
}

export function isResponsive(html: string): boolean {
  return /<meta[^>]+name=["']viewport["']/i.test(html);
}

export interface EnrichOptions {
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
  userAgent?: string;
}

/**
 * Fetch the company site (if any) and derive signals. Timeout-safe: on any
 * failure returns the base signals with a diagnostic webStatus.
 */
export async function enrichCompany(
  company: Company,
  opts: EnrichOptions = {},
): Promise<{ signals: Signals; webStatus: WebStatus }> {
  const website = normalizeWebsite(company.website);
  const base = baseSignals({ website, email: company.email, socialLinks: company.socialLinks });
  if (!website) return { signals: base, webStatus: "no_site" };

  const doFetch = opts.fetchImpl ?? fetch;
  const timeoutMs = opts.timeoutMs ?? 6000;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await doFetch(website, {
      signal: controller.signal,
      redirect: "follow",
      headers: { "user-agent": opts.userAgent ?? "SkylineRadar/1.0 (+https://skyline-digital.uz)" },
    });
    if (!res.ok) return { signals: { ...base, hasWebsite: true }, webStatus: "unreachable" };
    const html = (await res.text()).slice(0, 500_000);
    const emails = extractEmails(html);
    const socials = extractSocials(html);
    const signals: Signals = {
      hasWebsite: true,
      hasEmail: base.hasEmail || emails.length > 0,
      hasSocial: base.hasSocial || socials.length > 0,
      hasCta: hasCtaText(html),
      domainAgeYears: null, // WHOIS/SOA intentionally skipped — not scored (ADR 0002)
      responsive: isResponsive(html),
    };
    return { signals, webStatus: "ok" };
  } catch (err) {
    const aborted = err instanceof Error && err.name === "AbortError";
    return { signals: { ...base, hasWebsite: true }, webStatus: aborted ? "timeout" : "error" };
  } finally {
    clearTimeout(timer);
  }
}
