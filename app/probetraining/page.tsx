import type { Metadata } from "next";
import type { ReactNode } from "react";
import { createMetadata } from "@/lib/metadata";
import { TransitionLink } from "@/components/transition-link";
import { TrialForm } from "@/components/trial/trial-form";

export const metadata: Metadata = createMetadata({
  title: "Probetraining",
  description:
    "Probetraining bei der Jiu Jitsu Kaisen Akademie in Graz: gratis, ohne Vorkenntnisse. Kurz schreiben, wann du kommen willst.",
  path: "/probetraining",
});

/**
 * /probetraining — eigene Seite statt Fenster (Wunsch des Vorstands,
 * 11.10.2026), damit der Knopf mit demselben Uebergang wechselt wie
 * "Für Mitglieder" und die Seite einen eigenen Link hat, den man teilen kann.
 * Rahmen wie /beitreten.
 */
export default function ProbetrainingPage(): ReactNode {
  return (
    <main id="main-content" className="min-h-screen bg-background-deep">
      <div className="mx-auto w-full max-w-[36rem] px-5 py-16 sm:px-8 sm:py-24">
        <TransitionLink
          href="/"
          className="inline-flex h-11 items-center gap-2 rounded-full border border-border bg-card-plate px-5 text-sm font-medium text-foreground-dim transition-colors hover:border-border-hot hover:bg-card-plate-hot hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
        >
          <span aria-hidden="true">←</span> Startseite
        </TransitionLink>

        <header className="mt-12">
          <p className="font-mono text-[0.68rem] font-medium uppercase tracking-[0.24em] text-accent">
            Teste die Akademie
          </p>
          <h1 className="jjk-section-title mt-4">Probetraining</h1>
          <p className="mt-5 text-base leading-relaxed text-foreground-dim">
            Das Probetraining ist gratis, Vorkenntnisse brauchst du keine. Kurze Hose, T-Shirt,
            Wasser &mdash; mehr nicht. Schreib uns kurz, wann du kommen willst, wir melden uns.
          </p>
        </header>

        <div className="mt-6">
          <TrialForm />
        </div>
      </div>
    </main>
  );
}
