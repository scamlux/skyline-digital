import { extractEmails } from "@/lib/radar/signals";

/**
 * Contacts & presence extractor (engine 2.1, ADR 0010).
 *
 * Pure: takes what the page exposes (link targets, iframe/script sources, a
 * slice of visible text, hreflang codes) and returns where the business can be
 * found and reached. Used by the report ("где вас найти") and by the radar
 * batch, which writes the handles back to companies — radar has phones only,
 * and an Instagram / e-mail is what makes consented outreach possible.
 *
 * Nothing here is scored: presence is informational, the total stays
 * comparable across 2.x (scoreVersion is unchanged).
 */

export type PaymentSystem = "payme" | "click" | "uzum" | "paynet" | "stripe" | "paypal";
export type MapService = "yandex" | "google" | "2gis";

export interface Presence {
  emails: string[];
  phones: string[];
  instagram: string[];
  telegram: string[];
  whatsapp: string[];
  facebook: string[];
  youtube: string[];
  tiktok: string[];
  maps: MapService[];
  payments: PaymentSystem[];
  /** Language versions the site declares or links to (hreflang / switcher). */
  languages: string[];
}

export interface PresenceInput {
  /** href/src values of <a>, <iframe>, <script>, <form action> — absolute. */
  urls: string[];
  /** Visible text, truncated by the caller. */
  text: string;
  /** hreflang codes and lang switcher codes. */
  langs: string[];
}

/** Cap every list — the result is stored inside each audit row. */
const MAX_PER_LIST = 5;

const take = (set: Set<string>) => [...set].slice(0, MAX_PER_LIST);

/** Instagram paths that are not a profile. */
const IG_NON_PROFILE = new Set(["p", "reel", "reels", "explore", "stories", "accounts", "tv", "about", "legal", "direct"]);
const TG_NON_PROFILE = new Set(["share", "joinchat", "addstickers", "proxy", "iv", "s"]);

function host(u: URL): string {
  return u.hostname.toLowerCase().replace(/^www\./, "").replace(/^m\./, "");
}

/** First path segment, without "@". */
function firstSegment(u: URL): string | null {
  const seg = u.pathname.split("/").filter(Boolean)[0];
  return seg ? decodeURIComponent(seg).replace(/^@/, "") : null;
}

/** Uzbek numbers in text: +998 XX XXX XX XX in common spellings. */
const UZ_PHONE_RE = /(?:\+?998)[\s\-()]*\d{2}[\s\-()]*\d{3}[\s\-]*\d{2}[\s\-]*\d{2}/g;

export function normalizeUzPhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  const local = digits.startsWith("998") ? digits.slice(3) : digits.length === 9 ? digits : null;
  return local && local.length === 9 ? `+998${local}` : null;
}

export function extractPresence(input: PresenceInput): Presence {
  const sets = {
    emails: new Set<string>(),
    phones: new Set<string>(),
    instagram: new Set<string>(),
    telegram: new Set<string>(),
    whatsapp: new Set<string>(),
    facebook: new Set<string>(),
    youtube: new Set<string>(),
    tiktok: new Set<string>(),
  };
  const maps = new Set<MapService>();
  const payments = new Set<PaymentSystem>();

  for (const raw of input.urls) {
    const s = raw.trim();
    if (!s) continue;
    const lower = s.toLowerCase();
    if (lower.startsWith("mailto:")) {
      for (const e of extractEmails(decodeURIComponent(s.slice(7).split("?")[0]))) sets.emails.add(e);
      continue;
    }
    if (lower.startsWith("tel:")) {
      const p = normalizeUzPhone(s.slice(4));
      if (p) sets.phones.add(p);
      continue;
    }
    if (lower.startsWith("tg:")) {
      const m = s.match(/domain=([A-Za-z0-9_]{4,})/);
      if (m) sets.telegram.add(m[1]);
      continue;
    }
    let u: URL;
    try {
      u = new URL(s);
    } catch {
      continue;
    }
    const h = host(u);
    const seg = firstSegment(u);

    if (h === "instagram.com" && seg && !IG_NON_PROFILE.has(seg.toLowerCase())) {
      sets.instagram.add(seg.toLowerCase());
    } else if ((h === "t.me" || h === "telegram.me") && seg && !TG_NON_PROFILE.has(seg.toLowerCase())) {
      sets.telegram.add(seg);
    } else if (h === "wa.me" && seg) {
      const p = normalizeUzPhone(seg) ?? (/^\d{10,15}$/.test(seg) ? `+${seg}` : null);
      if (p) sets.whatsapp.add(p);
    } else if (h === "api.whatsapp.com" || h === "web.whatsapp.com") {
      const phone = u.searchParams.get("phone");
      const p = phone ? normalizeUzPhone(phone) ?? `+${phone.replace(/\D/g, "")}` : null;
      if (p && p.length > 8) sets.whatsapp.add(p);
    } else if ((h === "facebook.com" || h === "fb.com") && seg && !["sharer", "sharer.php", "tr", "plugins", "dialog"].includes(seg.toLowerCase())) {
      sets.facebook.add(seg);
    } else if (h === "youtube.com" || h === "youtu.be") {
      // Channels only: /@handle, /channel/ID, /c/name, /user/name (not videos).
      const parts = u.pathname.split("/").filter(Boolean);
      if (parts[0]?.startsWith("@")) sets.youtube.add(parts[0]);
      else if (parts.length >= 2 && ["channel", "c", "user"].includes(parts[0])) sets.youtube.add(`${parts[0]}/${parts[1]}`);
    } else if (h === "tiktok.com" && u.pathname.startsWith("/@")) {
      sets.tiktok.add(u.pathname.slice(2).split("/")[0]);
    }

    // Maps: a link or an embed means the business can be found on the map.
    if (/(^|\.)yandex\.(ru|uz|com)$/.test(h) && u.pathname.startsWith("/map")) maps.add("yandex");
    if (h === "api-maps.yandex.ru") maps.add("yandex");
    if ((h === "google.com" || h.endsWith(".google.com")) && u.pathname.startsWith("/maps")) maps.add("google");
    if (h === "maps.google.com" || h === "maps.app.goo.gl" || (h === "goo.gl" && u.pathname.startsWith("/maps"))) {
      maps.add("google");
    }
    if (/(^|\.)2gis\.(uz|ru|kz|com)$/.test(h)) maps.add("2gis");

    // Online payment: checkout hosts or widget scripts.
    if (/(^|\.)payme\.uz$/.test(h) || h === "checkout.paycom.uz") payments.add("payme");
    if (/(^|\.)click\.uz$/.test(h)) payments.add("click");
    if (/(^|\.)uzum\.uz$/.test(h) || h.startsWith("checkout.uzum")) payments.add("uzum");
    if (/(^|\.)paynet\.uz$/.test(h)) payments.add("paynet");
    if (h === "js.stripe.com" || h === "checkout.stripe.com") payments.add("stripe");
    if (/(^|\.)paypal\.com$/.test(h)) payments.add("paypal");
  }

  for (const e of extractEmails(input.text)) sets.emails.add(e);
  for (const m of input.text.matchAll(UZ_PHONE_RE)) {
    const p = normalizeUzPhone(m[0]);
    if (p) sets.phones.add(p);
  }

  const languages = [
    ...new Set(
      input.langs
        .map((l) => l.toLowerCase().trim().split(/[-_]/)[0])
        .filter((l) => /^[a-z]{2}$/.test(l)),
    ),
  ].slice(0, 6);

  return {
    emails: take(sets.emails),
    phones: take(sets.phones),
    instagram: take(sets.instagram),
    telegram: take(sets.telegram),
    whatsapp: take(sets.whatsapp),
    facebook: take(sets.facebook),
    youtube: take(sets.youtube),
    tiktok: take(sets.tiktok),
    maps: [...maps],
    payments: [...payments],
    languages,
  };
}
