"use client";

import type { ReactNode } from "react";
import { useFormStatus } from "react-dom";

/**
 * Der Bezahlknopf, gesperrt waehrend die Aktion laeuft (30.10.2026). Die
 * eigentliche Sicherung gegen doppelte Zahlungen sitzt im Server
 * (pay-actions.ts, mollie_checkouts); das hier erspart nur den zweiten
 * Request und zeigt, dass etwas passiert — der Weg zu Mollie dauert eine
 * Sekunde, und in der wurde vorher ein zweites Mal getippt.
 *
 * Seit 31.10.2026 .jjk-btn-loud statt weisser Pille auf rotem Grund: der
 * Grund ist jetzt Papier, und dies ist auf der Seite die einzige Flaeche in
 * vollem Zinnober — genau die Ausnahme, fuer die globals.css die Klasse
 * vorsieht (eine Handlung, um die es geht). Die Abstimmung bekommt bewusst
 * keinen zweiten Vollton, siehe .jjk-mb-vote-btn. Die Farbe kommt damit aus
 * der Klasse, der fruehere `color`-Parameter ist weg.
 */
export function PayButton({ children }: { children: ReactNode }): ReactNode {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      className="jjk-btn jjk-btn-loud w-full text-center leading-snug disabled:cursor-wait disabled:opacity-70"
    >
      {/* Ein Kind fuer .jjk-btn (inline-flex): sonst wird jeder Textteil
          ein eigenes Flex-Element, und der Betrag stand als zweite Spalte
          neben dem umbrochenen Text (390 px). */}
      <span>{pending ? "Weiter zu Mollie …" : children}</span>
    </button>
  );
}
