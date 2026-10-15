import type { MetadataRoute } from "next";
import { siteConfig, SITE_INDEXABLE } from "@/lib/metadata";

export default function sitemap(): MetadataRoute.Sitemap {
  // Leere Sitemap solange die Seite nicht indexiert werden soll.
  // /mitglieder taucht hier nie auf.
  if (!SITE_INDEXABLE) return [];

  const baseUrl = siteConfig.url;

  return [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
    // Die Rechtsseiten gehoeren in die Sitemap, auch wenn sie niemand sucht:
    // sie sind der Beleg, dass es sie gibt, und sie sind von der Startseite
    // nur ueber den Fuss und das Menue erreichbar. `yearly`, weil sich ein
    // Impressum genau dann aendert, wenn der Vorstand wechselt.
    {
      url: `${baseUrl}/probetraining`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/beitreten`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${baseUrl}/bedingungen`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${baseUrl}/impressum`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${baseUrl}/datenschutz`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ];
}
