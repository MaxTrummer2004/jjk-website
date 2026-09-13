import { Providers } from "@/components/providers";
import { SkipToContent } from "@/components/skip-to-content";
import { Atmosphere } from "@/components/atmosphere";
import { PageTransitionOverlay } from "@/components/page-transition-overlay";
import { baseMetadata } from "@/lib/metadata";
import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Oswald } from "next/font/google";
import localFont from "next/font/local";
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

/**
 * Die beiden japanischen Schnitte kamen bis hierher per <link> aus dem
 * Google-CDN. Damit ging die IP jedes Besuchers ohne Einwilligung an Google in
 * die USA — in der EU abmahnbar (LG Muenchen I, 3 O 17493/20). Jetzt liegen
 * sie unter public/fonts/ und kommen ueber next/font/local.
 *
 * Der alte Kommentar an dieser Stelle sagte, next/font habe kein japanisches
 * Subset. Das stimmt nur fuer next/font/GOOGLE: das bedient sich am
 * Google-Manifest, und dort ist fuer diese beiden Familien nur `latin`
 * hinterlegt. next/font/LOCAL nimmt jede Datei, die man ihm hinlegt.
 *
 * Die Dateien sind Subsets, gebaut von scripts/gen-fonts.py. Vollstaendig
 * waere Shippori Mincho B1 rund 2 MB pro Schnitt (JIS Level 1+2); das Subset
 * traegt die Kana-Bloecke, Latin-1 und genau die Kanji, die im Quelltext
 * vorkommen, und liegt bei ~78 kB. WER EIN NEUES KANJI SCHREIBT, MUSS DAS
 * SKRIPT NEU LAUFEN LASSEN — es liest die Zeichen aus app/, components/ und
 * lib/ und meldet sich, wenn eines fehlt.
 */
const shippori = localFont({
  src: [
    { path: "../public/fonts/shippori-mincho-b1-600.woff2", weight: "600", style: "normal" },
    { path: "../public/fonts/shippori-mincho-b1-700.woff2", weight: "700", style: "normal" },
    { path: "../public/fonts/shippori-mincho-b1-800.woff2", weight: "800", style: "normal" },
  ],
  variable: "--font-shippori",
  display: "swap",
  // Die Ersatzkette steht in globals.css am Token --font-jp, damit sie an
  // einer Stelle steht und nicht an zweien. adjustFontFallback rechnet sonst
  // Arial-Metriken auf eine Mincho — das verschiebt jedes Kanji.
  adjustFontFallback: false,
});

/**
 * Yuji Syuku traegt nur --font-brush, und das benutzt derzeit ausschliesslich
 * components/fly-in.tsx — die alte, ausgehaengte Eroeffnung (siehe CLAUDE.md
 * §3). Deshalb preload: false: die Datei wird gebaut und ausgeliefert, aber
 * sie steht nicht im kritischen Pfad der Startseite, die sie nicht rendert.
 */
const yuji = localFont({
  src: [{ path: "../public/fonts/yuji-syuku-400.woff2", weight: "400", style: "normal" }],
  variable: "--font-yuji",
  display: "swap",
  preload: false,
  adjustFontFallback: false,
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
        {/* Hier stand ein Preload auf /img/gate-hero.webp, mit
            fetchPriority="high" und damit vor allem anderen im Rennen. Die
            Datei gibt es nicht (mehr): der Request war ein 404, und die
            Klasse .jjk-gate-canvas, fuer die er gedacht war, rendert kein
            Bauteil mehr. Am Handy kostete das den ersten Round-Trip, den
            eigentlich das Logo im Ladebildschirm gebraucht haette. Die tote
            Regel liegt weiter in globals.css. */}
        {/* Hier standen ausserdem drei <link> auf fonts.googleapis.com und
            fonts.gstatic.com. Die sind raus — siehe die beiden localFont-
            Aufrufe oben. Es darf von dieser Seite keine Anfrage mehr an eine
            Google-Domain gehen. */}
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${oswald.variable} ${shippori.variable} ${yuji.variable} min-h-screen bg-background font-sans text-foreground antialiased`}
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
