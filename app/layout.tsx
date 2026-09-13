import { Providers } from "@/components/providers";
import { SkipToContent } from "@/components/skip-to-content";
import { Atmosphere } from "@/components/atmosphere";
import { PageTransitionOverlay } from "@/components/page-transition-overlay";
import { baseMetadata } from "@/lib/metadata";
import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import type { ReactNode } from "react";
import "./globals.css";

/**
 * ALLE SCHRIFTEN DIESER SEITE, UND ZWAR VOM EIGENEN SERVER.
 *
 * Hier standen bis vor kurzem zwei verschiedene Sachen: drei Aufrufe von
 * next/font/google (Geist, Geist Mono, Oswald) und drei <link> auf
 * fonts.googleapis.com fuer die beiden japanischen Schnitte. Die <link> waren
 * das dringende Problem — damit ging die IP jedes Besuchers ohne Einwilligung
 * an Google in die USA, in der EU abmahnbar (LG Muenchen I, 3 O 17493/20).
 *
 * next/font/google war nie ein Datenschutzproblem: es laedt beim BUILD
 * herunter und liefert danach vom eigenen Server. Es macht den Build aber von
 * einem fremden Dienst abhaengig, und deshalb ist auch das jetzt weg. Alle
 * Dateien liegen unter public/fonts/ und werden von scripts/gen-fonts.py
 * gebaut. Das Projekt ruft Google an keiner Stelle mehr auf, weder zur
 * Laufzeit noch beim Bauen.
 *
 * Der alte Kommentar an dieser Stelle sagte, next/font habe kein japanisches
 * Subset. Das stimmt nur fuer next/font/GOOGLE: das bedient sich am
 * Google-Manifest, und dort ist fuer diese beiden Familien nur `latin`
 * hinterlegt. next/font/LOCAL nimmt jede Datei, die man ihm hinlegt.
 *
 * EINE ANZEIGESCHRIFT WENIGER. Oswald ist raus. Die Ueberschriften stehen
 * jetzt in Shippori Mincho B1 — derselben Schrift wie die Kanji, weil es
 * dieselbe Schrift SEIN SOLL. Shippori Mincho basiert auf der "Tokyo Tsukiji
 * Type Foundry No. 5 Mincho", der Giesserei, die den japanischen Mincho-Stil
 * im 19. Jahrhundert gepraegt hat, also in genau der Zeit, in der diese Seite
 * spielt; ihr ExtraBold ist laut Hersteller "originally designed for titles
 * and headlines"; und die Variante B1 hat gegenueber der Grundschrift
 * "rounded corners and ink pooling" — gemalte Ecken und Tinte, die ins Papier
 * laeuft. Oswald dagegen ist eine amerikanische schmale Grotesk nach
 * 'Alternate Gothic', gezeichnet fuers Bildschirmraster. Sie kam mit dem
 * Template, nicht mit dem Entwurf.
 *
 * Wer ein neues Kanji oder Sonderzeichen in den Quelltext schreibt, muss
 * scripts/gen-fonts.py neu laufen lassen. Das Skript liest die Zeichen aus
 * app/, components/ und lib/ und meldet, wenn eines fehlt.
 */

const shippori = localFont({
  src: [
    { path: "../public/fonts/shippori-mincho-b1-600.woff2", weight: "600", style: "normal" },
    { path: "../public/fonts/shippori-mincho-b1-700.woff2", weight: "700", style: "normal" },
    { path: "../public/fonts/shippori-mincho-b1-800.woff2", weight: "800", style: "normal" },
  ],
  variable: "--font-shippori",
  display: "swap",
  // Die Ersatzkette steht in globals.css an --font-jp, damit sie an einer
  // Stelle steht und nicht an zweien. adjustFontFallback rechnet sonst
  // Arial-Metriken auf eine Mincho — das verschiebt jedes Zeichen.
  adjustFontFallback: false,
});

/**
 * Yuji Syuku traegt nur --font-brush, und das benutzt derzeit ausschliesslich
 * components/fly-in.tsx — die alte, ausgehaengte Eroeffnung (CLAUDE.md §3).
 * Deshalb preload: false. Die Datei wird gebaut und ausgeliefert, steht aber
 * nicht im kritischen Pfad der Startseite, die sie nicht rendert.
 */
const yuji = localFont({
  src: [{ path: "../public/fonts/yuji-syuku-400.woff2", weight: "400", style: "normal" }],
  variable: "--font-yuji",
  display: "swap",
  preload: false,
  adjustFontFallback: false,
});

/**
 * Geist und Geist Mono als Variable Fonts: EINE Datei deckt 100 bis 900 ab.
 * Das ist billiger als vier feste Schnitte (28 kB statt ~4 x 20 kB) und
 * erlaubt jedes Gewicht dazwischen, ohne dass eine weitere Datei faellig
 * wird.
 */
const geistSans = localFont({
  src: [{ path: "../public/fonts/geist-var.woff2", weight: "100 900", style: "normal" }],
  variable: "--font-geist-sans",
  display: "swap",
  adjustFontFallback: false,
});

const geistMono = localFont({
  src: [{ path: "../public/fonts/geist-mono-var.woff2", weight: "100 900", style: "normal" }],
  variable: "--font-geist-mono",
  display: "swap",
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
            fonts.gstatic.com. Die sind raus — siehe die localFont-Aufrufe
            oben. Von dieser Seite darf keine Anfrage mehr an eine
            Google-Domain gehen. */}
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${shippori.variable} ${yuji.variable} min-h-screen bg-background font-sans text-foreground antialiased`}
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
