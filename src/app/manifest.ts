import type { MetadataRoute } from "next";
import { SITE_NAME } from "@/lib/seo";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${SITE_NAME} — Web, Mobile & AI Agency`,
    short_name: SITE_NAME,
    description:
      "Digital agency: websites, web & mobile apps, AI solutions and automation. Estimate your project cost online.",
    start_url: "/",
    display: "standalone",
    background_color: "#1a2238",
    theme_color: "#1a2238",
    icons: [
      { src: "/icon", sizes: "32x32", type: "image/png" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
  };
}
