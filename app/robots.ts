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
          // 30.10.2026: /mitglieder steht NICHT mehr hier. Die Seite ist aus
          // Kopfleiste, Fuss und Datenschutzerklaerung auf jeder Seite
          // verlinkt — Google kennt die URL also sicher. Gesperrt hiesse:
          // Google darf sie nicht abrufen, sieht ihr noindex nie und fuehrt
          // sie womoeglich als "indexiert, obwohl durch robots.txt blockiert"
          // mit nacktem Link im Ergebnis. Jetzt traegt app/mitglieder/layout.tsx
          // noindex,nofollow, und das wirkt nur, wenn es gelesen wird.
          //
          // /vorstand und /konto-einrichten bleiben gesperrt: oeffentlich nicht
          // verlinkt (also kaum je entdeckt), beide tragen zusaetzlich noindex,
          // und /konto-einrichten?token=… ist ein Einmal-Geheimnis — das soll
          // kein Crawler abrufen, auch wenn der Link irgendwo auftaucht.
          "/vorstand",
          "/konto-einrichten",
        ],
      },
    ],
    host: siteConfig.url,
  };
  if (SITE_INDEXABLE) base.sitemap = `${siteConfig.url}/sitemap.xml`;
  return base;
}
