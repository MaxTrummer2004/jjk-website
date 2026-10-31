/**
 * 404 — jede Adresse, die es nicht gibt.
 *
 * 31.10.2026 neu. Vorher gab es diese Datei nicht, und Next lieferte seine
 * englische Standardseite ("404 | This page could not be found.") in
 * Systemschrift auf Schwarz. Schlimmer war der Kopf: die Seite erbte
 * baseMetadata, also robots "index, follow" samt googlebot-Zeile UND
 * canonical auf die Startseite — neben dem "noindex", das Next bei Status 404
 * selbst einsetzt. Drei Robots-Angaben, die sich widersprechen, und ein
 * canonical, das jede Tippfehler-Adresse zum Duplikat der Startseite erklaert.
 *
 * Darum hier `robots: null` und `alternates: null`. null setzt ein geerbtes
 * Feld in Next zurueck, statt es zu ueberschreiben: es bleibt genau das eine
 * "noindex", das Next fuer den 404-Status selbst schreibt, und kein canonical.
 * Eigenes `robots: { index: false }` waere die zweite Zeile daneben gewesen.
 * Der Status bleibt 404 — not-found.tsx aendert nur, was gerendert wird.
 *
 * Rahmen wie LegalPage und /probetraining: derselbe Grund, dieselbe
 * Ueberschriftklasse, eine Schaltflaeche zurueck. LegalPage selbst passt
 * nicht, sie bringt zwei Zurueck-Knoepfe und einen leeren Textkoerper mit.
 * Keine Nav und kein Footer, aus demselben Grund wie dort: beide bestehen
 * fast nur aus Ankern auf die Startseite.
 *
 * Das Kanji ist 何処 (doko, "wo?"). Beide Zeichen stehen schon in allen drei
 * Shippori-Dateien (per fontTools-cmap geprueft), die Kana der Furigana
 * nimmt gen-fonts.py ohnehin vollstaendig mit — es muss nicht neu laufen.
 * Laeuft es spaeter, findet es 何処 hier im Quelltext und behaelt sie.
 */

import { KanjiLabel } from "@/components/kanji-label";
import { TransitionLink } from "@/components/transition-link";
import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Seite nicht gefunden",
  robots: null,
  alternates: null,
};

export default function NotFound(): ReactNode {
  return (
    <main
      id="main-content"
      className="flex min-h-svh items-center bg-background-deep"
    >
      <div className="mx-auto w-full max-w-[36rem] px-5 py-16 sm:px-8 sm:py-24">
        <KanjiLabel kanji="何処" furigana="どこ" gloss="Fehler 404" />
        <h1 className="jjk-section-title">Seite nicht gefunden</h1>
        <p className="mt-5 text-base leading-relaxed text-foreground-dim">
          Unter dieser Adresse gibt es nichts. Vielleicht ist der Link alt
          oder hat einen Tippfehler.
        </p>
        <div className="mt-10">
          <TransitionLink
            href="/"
            className="jjk-btn focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
          >
            Zur Startseite
          </TransitionLink>
        </div>
      </div>
    </main>
  );
}
