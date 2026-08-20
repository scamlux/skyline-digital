/**
 * Client-side capture of acquisition context (UTM tags, referrer, landing page)
 * to attach to a lead. Safe to import in client components. Returns empty
 * strings during SSR.
 */
export interface LeadContext {
  source: string;
  utm_source: string;
  utm_medium: string;
  utm_campaign: string;
  utm_content: string;
  landing_page: string;
  referrer: string;
}

export function getLeadContext(): LeadContext {
  if (typeof window === "undefined") {
    return {
      source: "",
      utm_source: "",
      utm_medium: "",
      utm_campaign: "",
      utm_content: "",
      landing_page: "",
      referrer: "",
    };
  }
  const p = new URLSearchParams(window.location.search);
  const referrer = document.referrer || "";
  const utm_source = p.get("utm_source") ?? "";
  // Derive a coarse source: explicit utm_source → referrer host → "direct".
  let source = utm_source;
  if (!source) {
    if (referrer) {
      try {
        source = new URL(referrer).hostname;
      } catch {
        source = "referral";
      }
    } else {
      source = "direct";
    }
  }
  return {
    source,
    utm_source,
    utm_medium: p.get("utm_medium") ?? "",
    utm_campaign: p.get("utm_campaign") ?? "",
    utm_content: p.get("utm_content") ?? "",
    landing_page: window.location.href.split("#")[0],
    referrer,
  };
}
