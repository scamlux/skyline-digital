import type { AuditTools } from "./types";

/**
 * Turns the informational tools of an audit into translated, display-ready
 * sections. Pure and client-safe: the live result view, the downloadable HTML
 * and the server-rendered PDF all render the same rows.
 */

export type Tone = "ok" | "warn" | "bad";
export interface ToolRow {
  label: string;
  value: string;
  tone?: Tone;
}
export interface ToolSection {
  id: "presence" | "mail" | "links";
  title: string;
  rows: ToolRow[];
}

type T = (key: string, values?: Record<string, string | number>) => string;

const PAYMENT_NAMES: Record<string, string> = {
  payme: "Payme", click: "Click", uzum: "Uzum", paynet: "Paynet", stripe: "Stripe", paypal: "PayPal",
};
const MAP_NAMES: Record<string, string> = { yandex: "Yandex Maps", google: "Google Maps", "2gis": "2GIS" };

/** `t` must be scoped to the `audit` namespace. */
export function buildToolSections(tools: AuditTools | undefined, t: T): ToolSection[] {
  if (!tools) return [];
  const out: ToolSection[] = [];
  const none = t("tools.none");

  const p = tools.presence;
  if (p) {
    const list = (xs: string[], fmt: (x: string) => string = (x) => x) => (xs.length ? xs.map(fmt).join(", ") : none);
    const rows: ToolRow[] = [
      { label: "Instagram", value: list(p.instagram, (h) => `@${h}`), tone: p.instagram.length ? "ok" : "warn" },
      { label: "Telegram", value: list(p.telegram, (h) => `@${h}`), tone: p.telegram.length ? "ok" : "warn" },
      { label: "WhatsApp", value: list(p.whatsapp) },
      { label: t("tools.email"), value: list(p.emails) },
      { label: t("tools.phone"), value: list(p.phones), tone: p.phones.length ? "ok" : "warn" },
      {
        label: t("tools.maps"),
        value: p.maps.length ? p.maps.map((m) => MAP_NAMES[m] ?? m).join(", ") : t("tools.mapsMissing"),
        tone: p.maps.length ? "ok" : "warn",
      },
      {
        label: t("tools.payments"),
        value: p.payments.length ? p.payments.map((x) => PAYMENT_NAMES[x] ?? x).join(", ") : t("tools.paymentsMissing"),
      },
      {
        label: t("tools.languages"),
        value: p.languages.length ? p.languages.map((l) => l.toUpperCase()).join(" · ") : none,
        tone: p.languages.length > 1 ? "ok" : undefined,
      },
    ];
    const extra = [...p.facebook.map((h) => `Facebook: ${h}`), ...p.youtube.map((h) => `YouTube: ${h}`), ...p.tiktok.map((h) => `TikTok: @${h}`)];
    if (extra.length) rows.push({ label: t("tools.otherSocials"), value: extra.join(", ") });
    out.push({ id: "presence", title: t("tools.presenceTitle"), rows });
  }

  const m = tools.mail;
  if (m) {
    const yes = t("tools.yes");
    const no = t("tools.no");
    const protectedMail = m.mx && m.spf && m.dmarc != null;
    out.push({
      id: "mail",
      title: t("tools.mailTitle", { domain: m.domain }),
      rows: [
        { label: t("tools.mx"), value: m.mx ? yes : no, tone: m.mx ? "ok" : "warn" },
        { label: "SPF", value: m.spf ? yes : no, tone: m.spf ? "ok" : "bad" },
        { label: "DMARC", value: m.dmarc ?? no, tone: m.dmarc === "reject" || m.dmarc === "quarantine" ? "ok" : m.dmarc ? "warn" : "bad" },
        {
          label: t("tools.verdict"),
          value: !m.mx ? t("tools.mailNone") : protectedMail ? t("tools.mailOk") : t("tools.mailRisk"),
          tone: !m.mx ? "warn" : protectedMail ? "ok" : "bad",
        },
      ],
    });
  }

  const l = tools.links;
  if (l && l.checked > 0) {
    const rows: ToolRow[] = [
      { label: t("tools.linksChecked"), value: String(l.checked) },
      {
        label: t("tools.linksBroken"),
        value: l.broken.length ? String(l.broken.length) : t("tools.linksAllOk"),
        tone: l.broken.length ? "bad" : "ok",
      },
    ];
    for (const b of l.broken.slice(0, 5)) {
      let path = b.url;
      try {
        const u = new URL(b.url);
        path = u.pathname + u.search;
      } catch {
        /* keep raw */
      }
      rows.push({ label: path, value: b.status ? `HTTP ${b.status}` : t("tools.noAnswer"), tone: "bad" });
    }
    out.push({ id: "links", title: t("tools.linksTitle"), rows });
  }
  return out;
}
