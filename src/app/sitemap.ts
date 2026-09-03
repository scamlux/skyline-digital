import type { MetadataRoute } from "next";
import { getProjects } from "@/lib/portfolio";
import { localeUrl, languageAlternates } from "@/lib/seo";
import { routing } from "@/i18n/routing";

const STATIC_PATHS = ["", "/about", "/services", "/projects", "/contact", "/calculator"];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = [];

  const add = (path: string, priority: number, changeFrequency: "monthly" | "yearly") => {
    // One entry per locale, each with hreflang alternates for the same path.
    for (const locale of routing.locales) {
      entries.push({
        url: localeUrl(locale, path),
        changeFrequency,
        priority,
        alternates: { languages: languageAlternates(path) },
      });
    }
  };

  for (const path of STATIC_PATHS) add(path, path === "" ? 1 : 0.7, "monthly");
  for (const p of await getProjects()) add(`/projects/${p.slug}`, 0.5, "yearly");

  return entries;
}
