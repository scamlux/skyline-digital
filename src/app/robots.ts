import type { MetadataRoute } from "next";

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Personal estimate pages must not be indexed.
      disallow: ["/api/", "/estimate/", "/*/estimate/"],
    },
    sitemap: `${BASE}/sitemap.xml`,
  };
}
