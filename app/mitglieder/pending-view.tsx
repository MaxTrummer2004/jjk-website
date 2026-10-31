import type { ReactNode } from "react";
import { logoutAction } from "./actions";
import { HomeLink } from "./home-link";

/**
 * Was ein Mitglied mit offenem (oder abgelehntem) Antrag sieht: nur den
 * eigenen Statusblock, den Weg zurueck und das Abmelden. Keine Rangliste,
 * keine Namen anderer Mitglieder.
 *
 * Seit 31.10.2026 mit derselben Kopfzeile wie der Bereich nach der Aufnahme
 * (member-profile.tsx): Augenbraue, Name, rechts die Verweise. Vorher eine
 * eigene, schmale Spalte mit runder Startseiten-Pille oben und einem runden
 * Abmelden-Knopf unten. Der Inhalt darunter bleibt schmal (44 rem) — es ist
 * ein Absatz und eine Liste, keine zwei Spalten.
 */
export function PendingView({ name, children }: { name: string; children: ReactNode }): ReactNode {
  return (
    <main id="main-content" className="min-h-screen w-full bg-background-deep">
      <div className="mx-auto w-full max-w-[75rem] px-4 py-12 sm:px-8 sm:py-16 lg:py-20">
        <header className="flex flex-col gap-5 border-b border-border pb-7 lg:flex-row lg:items-end lg:justify-between lg:gap-10 lg:pb-9">
          <div className="min-w-0">
            <p className="jjk-mb-eyebrow">Mitgliederbereich</p>
            <h1 className="jjk-section-title mt-3 wrap-break-word">{name}</h1>
          </div>
          <nav aria-label="Konto" className="jjk-mb-links lg:shrink-0 lg:justify-end">
            <form action={logoutAction} className="contents">
              <button type="submit" className="jjk-mb-link">
                Abmelden
              </button>
            </form>
            <HomeLink className="jjk-mb-link" />
          </nav>
        </header>
        <div className="mt-8 max-w-[44rem] lg:mt-12">{children}</div>
      </div>
    </main>
  );
}
