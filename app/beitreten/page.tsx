import { TransitionLink } from "@/components/transition-link";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { createMetadata } from "@/lib/metadata";
import { JoinForm } from "./join-form";

export const metadata: Metadata = createMetadata({
  title: "Mitglied werden",
  description:
    "Beitrittserklärung der Jiu Jitsu Kaisen Academy: online ausfüllen, der Vorstand bestätigt die Aufnahme.",
});

/**
 * /beitreten — die Beitrittserklaerung als Webseite. Der Rahmen ist derselbe
 * wie bei Impressum und Datenschutz (Startseiten-Link, Eyebrow, Titel), aber
 * bewusst NICHT ueber components/legal-page.tsx: dessen `.jjk-legal` setzt
 * Fliesstext-Typografie fuer h2/ul/dl, die Formularfelder sind kein
 * Fliesstext.
 */
export default function JoinPage(): ReactNode {
  return (
    <main id="main-content" className="min-h-screen bg-background-deep">
      <div className="mx-auto w-full max-w-[44rem] px-5 py-16 sm:px-8 sm:py-24">
        <TransitionLink
          href="/"
          className="inline-flex h-11 items-center gap-2 rounded-full border border-border bg-card-plate px-5 text-sm font-medium text-foreground-dim transition-colors hover:border-border-hot hover:bg-card-plate-hot hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
        >
          <span aria-hidden="true">←</span> Startseite
        </TransitionLink>

        <header className="mt-12">
          <p className="font-mono text-[0.68rem] font-medium uppercase tracking-[0.24em] text-accent">
            Beitrittserklärung
          </p>
          <h1 className="jjk-section-title mt-4">Mitglied werden</h1>
          <p className="mt-5 text-base leading-relaxed text-foreground-dim">
            Füll das Formular aus und leg dein Passwort fest. Danach bist du direkt im
            Mitgliederbereich eingeloggt und siehst dort, wie es weitergeht. Über die Aufnahme
            entscheidet der Vorstand &mdash; meistens beim nächsten Training.
          </p>
        </header>

        <JoinForm />
      </div>
    </main>
  );
}
