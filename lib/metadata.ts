import type { Metadata } from "next";

// Auf true setzen, wenn die Seite öffentlich gehen soll.
// false → noindex/nofollow auf allen Seiten; robots.txt und sitemap passen sich an.
export const SITE_INDEXABLE = true;

export const siteConfig = {
  name: "JJK · Jiu-Jitsu Kaisen Academy",
  description:
    "Brazilian Jiu-Jitsu mitten in Graz. Trainer, die unterrichten wollen, Partner, die dich besser machen, und eine Matte, auf der aus Anfängern Schwarzgurte werden. Probetraining jederzeit möglich.",
  url: "https://jjk.academy",
  ogImage: "/img/og-image.jpg",
  // 30.10.2026: `creator: "@jjkacademy"` entfernt. Das war ein Platzhalter aus
  // dem Template, nie als Vereinskonto bestaetigt. twitter:creator und
  // <meta name="creator"> haetten damit womoeglich auf einen Fremden gezeigt.
  // Kommt ein echtes Konto, gehoert es hierher zurueck.
  authors: [{ name: "Jiu-Jitsu Kaisen Academy", url: "https://jjk.academy" }],
  keywords: [
    "Brazilian Jiu-Jitsu",
    "BJJ Graz",
    "Jiu-Jitsu Graz",
    "Grappling Graz",
    "No-Gi",
    "Kampfsport Graz",
    "Selbstverteidigung Graz",
    "Fitnessboxen Graz",
    "Wettkampfteam",
    "JJK",
  ],
} as const;

// og:type/locale/site_name — gemeinsam fuer baseMetadata und createMetadata,
// siehe dort. site_name ist der Vereinsname ohne "JJK ·": den liest Google als
// einen der Hinweise fuer den Seitennamen im Suchergebnis.
const OG_BASE = {
  type: "website",
  locale: "de_AT",
  siteName: "Jiu-Jitsu Kaisen Academy",
} as const;

export const baseMetadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: siteConfig.name,
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
  keywords: [...siteConfig.keywords],
  authors: [...siteConfig.authors],
  publisher: siteConfig.name,
  robots: SITE_INDEXABLE
    ? {
        index: true,
        follow: true,
        googleBot: {
          index: true,
          follow: true,
          "max-video-preview": -1,
          "max-image-preview": "large",
          "max-snippet": -1,
        },
      }
    : {
        index: false,
        follow: false,
        nocache: true,
        googleBot: { index: false, follow: false },
      },
  alternates: { canonical: "/" },
  openGraph: {
    ...OG_BASE,
    url: siteConfig.url,
    title: siteConfig.name,
    description: siteConfig.description,
    images: [
      { url: siteConfig.ogImage, width: 1200, height: 630, alt: siteConfig.name },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: siteConfig.name,
    description: siteConfig.description,
    images: [siteConfig.ogImage],
  },
  // 30.10.2026: kein `icons`-Feld mehr. Es stand hier mit
  // apple: "/apple-icon.svg" — live ein 404, denn Next bedient app/apple-icon
  // nur als .png/.jpg, und iOS nimmt ohnehin kein SVG als Home-Symbol. Und
  // solange `icons` hier steht, UNTERDRUECKT es die Dateikonvention: im Build
  // erschien app/apple-icon.png dann gar nicht im <head> (gemessen), nur
  // favicon.ico, und das doppelt. Ohne das Feld setzt Next die Links aus
  // app/favicon.ico, app/icon.svg und app/apple-icon.png selbst, je einmal,
  // mit type, sizes und Cache-Hash. app/apple-icon.png erzeugt
  // scripts/gen-icons.mjs.
  manifest: "/site.webmanifest",
};

export function createMetadata({
  title,
  description,
  path,
  image,
  noIndex = false,
}: {
  title?: string;
  description?: string;
  path: string;
  image?: string;
  noIndex?: boolean;
}): Metadata {
  const url = `${siteConfig.url}${path}`;
  const ogImage = image ?? siteConfig.ogImage;

  // Next fuehrt Metadaten nur auf oberster Ebene zusammen: ein `openGraph`
  // hier ERSETZT das aus baseMetadata ganz. Bis 30.10.2026 fehlten deshalb auf
  // jeder Unterseite og:type, og:locale und og:site_name. OG_BASE und
  // twitter.card stehen darum hier ein zweites Mal.
  //
  // `path` ist seit 30.10.2026 Pflicht: vorher stand "/" als Vorgabe, und
  // /beitreten hat ihn vergessen — canonical und og:url zeigten auf die
  // Startseite, fuer Google ein Duplikat davon. Jetzt faellt das bei tsc auf.
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      ...OG_BASE,
      title: title ?? siteConfig.name,
      description: description ?? siteConfig.description,
      url,
      images: [
        { url: ogImage, width: 1200, height: 630, alt: title ?? siteConfig.name },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: title ?? siteConfig.name,
      description: description ?? siteConfig.description,
      images: [ogImage],
    },
    ...(noIndex && { robots: { index: false, follow: false } }),
  };
}
