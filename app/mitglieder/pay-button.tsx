"use client";

import type { ReactNode } from "react";
import { useFormStatus } from "react-dom";

/**
 * Der Bezahlknopf, gesperrt waehrend die Aktion laeuft (30.10.2026). Die
 * eigentliche Sicherung gegen doppelte Zahlungen sitzt im Server
 * (pay-actions.ts, mollie_checkouts); das hier erspart nur den zweiten
 * Request und zeigt, dass etwas passiert — der Weg zu Mollie dauert eine
 * Sekunde, und in der wurde vorher ein zweites Mal getippt.
 */
export function PayButton({ color, children }: { color: string; children: ReactNode }): ReactNode {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      className="inline-flex h-12 w-full items-center justify-center rounded-full bg-white px-4 text-center text-sm font-semibold transition-opacity hover:opacity-90 disabled:cursor-wait disabled:opacity-70"
      style={{ color }}
    >
      {pending ? "Weiter zu Mollie …" : children}
    </button>
  );
}
