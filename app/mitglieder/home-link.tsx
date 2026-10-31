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
      // Vorgabe eckig wie .jjk-btn (31.10.2026); vorher rounded-xl auf
      // --card, die letzte runde Kachel im Bereich. Braucht nur noch der
      // Hinweis "noch nicht eingerichtet" in page.tsx — Kopfzeilen und Login
      // geben ihre eigene Klasse mit.
      className={className ?? "jjk-btn jjk-btn-sm jjk-btn-quiet"}
    >
      <span aria-hidden>←</span> Startseite
    </TransitionLink>
  );
}

export default HomeLink;
