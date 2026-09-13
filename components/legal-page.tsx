/**
 * Der Rahmen fuer Impressum und Datenschutz.
 *
 * Bewusst KEIN <SiteNav /> und kein <Footer4 />: beide bestehen fast nur aus
 * Ankern auf Abschnitte der Startseite (#programs, #schedule, …), und ein
 * Anker, den es auf der aktuellen Seite nicht gibt, ist ein toter Link. Die
 * Startseite ist von hier aus ueber genau eine Schaltflaeche erreichbar, oben
 * und unten.
 *
 * Bewusst auch kein Intro-Loader und kein Hero: der Loader steckt in
 * components/hero.tsx bzw. jjk-hero.tsx und laeuft nur, wo der Hero gerendert
 * wird. Diese Seiten rendern ihn nicht, also laeuft er hier nicht — es war
 * nichts abzuschalten.
 *
 * Was bleibt, sind die Tokens: derselbe Grund, dieselbe Display-Schrift fuer
 * die Ueberschriften, dieselbe Mono-Zeile als Augenbraue, dasselbe Zinnober
 * als einzige Farbe. Die Textkoerper-Regeln stehen unter `.jjk-legal` in
 * app/globals.css, damit hier nichts Zweites entsteht, was Typografie setzt.
 */

import Link from "next/link";
import type { ReactNode } from "react";

export interface LegalPageProps {
  /** Die Ueberschrift, z. B. "Impressum" */
  title: string;
  /** Die Mono-Zeile darueber, z. B. "Offenlegung nach ECG und Mediengesetz" */
  eyebrow: string;
  /** Ein Satz unter der Ueberschrift, der sagt, was die Seite ist */
  lead: string;
  children: ReactNode;
}

const OTHER: Record<string, { href: string; label: string }> = {
  Impressum: { href: "/datenschutz", label: "Datenschutzerklärung" },
  Datenschutzerklärung: { href: "/impressum", label: "Impressum" },
};

function BackLink(): ReactNode {
  return (
    <Link
      href="/"
      className="inline-flex h-11 items-center gap-2 rounded-full border border-border bg-card-plate px-5 text-sm font-medium text-foreground-dim transition-colors hover:border-border-hot hover:bg-card-plate-hot hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
    >
      <span aria-hidden="true">←</span> Startseite
    </Link>
  );
}

export function LegalPage({ title, eyebrow, lead, children }: LegalPageProps): ReactNode {
  const other = OTHER[title];

  return (
    <main id="main-content" className="min-h-screen bg-background-deep">
      <div className="mx-auto w-full max-w-[52rem] px-5 py-16 sm:px-8 sm:py-24">
        <BackLink />

        <header className="mt-12 border-b border-border pb-10">
          <p className="font-mono text-[0.68rem] font-medium uppercase tracking-[0.24em] text-accent">
            {eyebrow}
          </p>
          <h1 className="jjk-section-title mt-4">
            {title}
          </h1>
          <p className="mt-5 text-base leading-relaxed text-foreground-dim">{lead}</p>
        </header>

        <div className="jjk-legal">{children}</div>

        <footer className="mt-20 flex flex-col gap-5 border-t border-border pt-10 sm:flex-row sm:items-center sm:justify-between">
          <BackLink />
          {other ? (
            <Link
              href={other.href}
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
            >
              {other.label} →
            </Link>
          ) : null}
        </footer>
      </div>
    </main>
  );
}

/**
 * Ein Platzhalter, den der Auftraggeber selbst ausfuellt.
 *
 * Er ist absichtlich auch IM BROWSER nicht zu uebersehen — Zinnober,
 * gepunktet unterstrichen, in Mono. Ein Impressum, in dem noch [ZVR-ZAHL]
 * steht, ist kein Impressum, und das soll man beim Drueberscrollen sehen und
 * nicht erst beim Lesen.
 */
export function Todo({ children }: { children: ReactNode }): ReactNode {
  return <span className="jjk-legal-todo">[{children}]</span>;
}

export default LegalPage;
