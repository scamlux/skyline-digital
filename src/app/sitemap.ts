import type { MetadataRoute } from "next";
import { routing } from "@/i18n/routing";
import { projects } from "@/data/projects";

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

const STATIC_PATHS = ["", "/about", "/services", "/projects", "/contact", "/calculator"];

export default function sitemap(): MetadataRoute.Sitemap {
  const entries: MetadataRoute.Sitemap = [];

  for (const locale of routing.locales) {
    const prefix = locale === routing.defaultLocale ? "" : `/${locale}`;
    for (const path of STATIC_PATHS) {
      entries.push({
        url: `${BASE}${prefix}${path}`,
        changeFrequency: "monthly",
        priority: path === "" ? 1 : 0.7,
      });
    }
    for (const p of projects) {
      entries.push({
        url: `${BASE}${prefix}/projects/${p.slug}`,
        changeFrequency: "yearly",
        priority: 0.5,
      });
    }
  }

  return entries;
}
