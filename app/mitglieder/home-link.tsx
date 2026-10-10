"use client";

/**
 * "← Startseite" — und die Weiterleitung setzt fuer diesen Besuch aus.
 *
 * middleware.ts schickt jeden Eingeloggten, der "/" aufruft, auf /mitglieder.
 * Ohne einen Ausweg waere dieser Link wirkungslos: er ginge nach "/", von dort
 * sofort wieder hierher, und ein Mitglied saehe die oeffentliche Seite nie
 * wieder — den Stundenplan, die Preise, die Karte. Der Klick setzt deshalb ein
 * Merkmal, das die Weiterleitung aussetzt, bis der Browser geschlossen wird.
 *
 * Das Cookie wird hier gesetzt und nicht in einer Server-Action, weil es genau
 * eine Zeile ist und nichts schuetzt: es entscheidet ausschliesslich darueber,
 * welche der beiden eigenen Seiten der Besucher sehen will.
 */

import { TransitionLink } from "@/components/transition-link";
import type { ReactNode } from "react";
import { HOME_OVERRIDE_COOKIE } from "@/lib/session-cookies";

export function HomeLink({ className }: { className?: string }): ReactNode {
  return (
    <TransitionLink
      href="/"
      onClick={() => {
        try {
          document.cookie = `${HOME_OVERRIDE_COOKIE}=1; path=/; SameSite=Lax`;
        } catch {
          /* Ohne Cookie landet man wieder hier — unschoen, aber nicht kaputt. */
        }
      }}
      className={
        className ??
        "inline-flex items-center gap-2 rounded-xl border border-white/10 bg-card px-4 py-2.5 text-sm font-medium text-foreground-dim transition-colors hover:border-white/20 hover:text-foreground"
      }
    >
      <span aria-hidden>←</span> Startseite
    </TransitionLink>
  );
}

export default HomeLink;
