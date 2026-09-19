import type { MetadataRoute } from "next";
import { siteConfig, SITE_INDEXABLE } from "@/lib/metadata";

export default function robots(): MetadataRoute.Robots {
  const base: MetadataRoute.Robots = {
    rules: [
      {
        userAgent: "*",
        // Crawling bleibt erlaubt — nur so kann Google das noindex-Meta lesen
        // und die Seite aus dem Index nehmen. Disallow würde die URL im Index
        // behalten, aber das noindex nie zustellen.
        allow: "/",
        disallow: [
          "/api/",
          "/private/",
          // /mitglieder dauerhaft draußen — unabhängig von SITE_INDEXABLE
          "/mitglieder",
        ],
      },
    ],
    host: siteConfig.url,
  };
  if (SITE_INDEXABLE) base.sitemap = `${siteConfig.url}/sitemap.xml`;
  return base;
}
