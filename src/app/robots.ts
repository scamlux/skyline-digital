import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Personal estimate and shared audit-report pages must not be indexed.
      disallow: ["/api/", "/estimate/", "/*/estimate/", "/audit/r/", "/*/audit/r/"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
