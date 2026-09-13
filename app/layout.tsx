import { Providers } from "@/components/providers";
import { SkipToContent } from "@/components/skip-to-content";
import { Atmosphere } from "@/components/atmosphere";
import { PageTransitionOverlay } from "@/components/page-transition-overlay";
import { baseMetadata } from "@/lib/metadata";
import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Oswald } from "next/font/google";
import type { ReactNode } from "react";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

const oswald = Oswald({
  variable: "--font-oswald",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = baseMetadata;

export const viewport: Viewport = {
  themeColor: "#07070a",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>): ReactNode {
  return (
    // `dark` is hard-coded: this design only exists in the dark.
    <html lang="de" className="dark" suppressHydrationWarning>
      <head>
        {/*
          Japanese display faces come from the Google CDN rather than next/font:
          next/font only ships the subsets in its bundled manifest, and for
          Shippori Mincho B1 / Yuji Syuku that is latin only — every kanji would
          silently fall back to a system font.
        */}
        {/* Hier stand ein Preload auf /img/gate-hero.webp, mit
            fetchPriority="high" und damit vor allem anderen im Rennen. Die
            Datei gibt es nicht (mehr): der Request war ein 404, und die
            Klasse .jjk-gate-canvas, fuer die er gedacht war, rendert kein
            Bauteil mehr. Am Handy kostete das den ersten Round-Trip, den
            eigentlich das Logo im Ladebildschirm gebraucht haette. Die tote
            Regel liegt weiter in globals.css. */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font -- rule targets
            the pages router; this is the root layout, so it loads once for every page */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Shippori+Mincho+B1:wght@600;700;800&family=Yuji+Syuku&display=swap"
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${oswald.variable} min-h-screen bg-background font-sans text-foreground antialiased`}
      >
        <Providers>
          <SkipToContent />
          {children}
          <Atmosphere />
          <PageTransitionOverlay />
        </Providers>
      </body>
    </html>
  );
}
