import type { Metadata } from "next";

export const siteConfig = {
  name: "JJK — Jiu-Jitsu Kaisen Academy",
  description:
    "Brazilian Jiu-Jitsu in the heart of Graz. World-class coaching, a family of training partners, and a mat that turns beginners into black belts. Book your free trial class.",
  url: "https://jjk-academy.com",
  ogImage: "/video/hero-poster.jpg",
  creator: "@jjkacademy",
  authors: [{ name: "Jiu-Jitsu Kaisen Academy", url: "https://jjk-academy.com" }],
  keywords: [
    "Brazilian Jiu-Jitsu",
    "BJJ Graz",
    "Jiu-Jitsu gym",
    "grappling",
    "no-gi",
    "martial arts Graz",
    "self-defense",
    "kids BJJ",
    "competition team",
    "JJK",
  ],
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
  creator: siteConfig.creator,
  publisher: siteConfig.name,
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: siteConfig.url,
    title: siteConfig.name,
    description: siteConfig.description,
    siteName: siteConfig.name,
    images: [
      { url: siteConfig.ogImage, width: 1600, height: 900, alt: siteConfig.name },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: siteConfig.name,
    description: siteConfig.description,
    images: [siteConfig.ogImage],
    creator: siteConfig.creator,
  },
  icons: {
    icon: "/favicon.ico",
    shortcut: "/icon.svg",
    apple: "/apple-icon.svg",
  },
  manifest: "/site.webmanifest",
};

export function createMetadata({
  title,
  description,
  path = "/",
  image,
  noIndex = false,
}: {
  title?: string;
  description?: string;
  path?: string;
  image?: string;
  noIndex?: boolean;
}): Metadata {
  const url = `${siteConfig.url}${path}`;
  const ogImage = image ?? siteConfig.ogImage;

  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      title: title ?? siteConfig.name,
      description: description ?? siteConfig.description,
      url,
      images: [
        { url: ogImage, width: 1600, height: 900, alt: title ?? siteConfig.name },
      ],
    },
    twitter: {
      title: title ?? siteConfig.name,
      description: description ?? siteConfig.description,
      images: [ogImage],
    },
    ...(noIndex && { robots: { index: false, follow: false } }),
  };
}
