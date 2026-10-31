"use client";

import { useActionState, useEffect, useRef, type ReactNode } from "react";
import { changePasswordAction, type ActionResult } from "./actions";

const initial: ActionResult & { ok?: boolean } = {};

/**
 * Eigenes Passwort aendern. Bis 31.10.2026 ein <details> ganz unten in der
 * Karte; jetzt oeffnet es der Verweis "Passwort ändern" in der Kopfzeile
 * (member-profile.tsx), und das Formular erscheint direkt darunter, ueber
 * die volle Breite der Kopfzeile, aber nur so breit wie noetig. Ein <details>
 * geht dafuer nicht mehr: Ausloeser und Inhalt stehen an zwei Stellen.
 *
 * Zu heisst `hidden`, nicht ausgehaengt — Fehlermeldung, Bestaetigung und
 * Eingaben ueberleben das Zuklappen. Beim Aufklappen springt der Fokus ins
 * erste Feld, sonst landet er nach dem Klick im Nichts unter der Kopfzeile.
 */
export function ChangePassword({ id, open }: { id: string; open: boolean }): ReactNode {
  const [state, action, pending] = useActionState(changePasswordAction, initial);
  const first = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) first.current?.focus();
  }, [open]);

  return (
    <section id={id} hidden={!open} aria-labelledby={`${id}-title`} className="jjk-mb-plate mt-6 p-5 sm:p-6">
      <h2 id={`${id}-title`} className="jjk-mb-eyebrow">
        Passwort ändern
      </h2>
      <form action={action} className="mt-4 grid gap-3 sm:grid-cols-3">
        <input
          ref={first}
          name="current"
          type="password"
          placeholder="Aktuelles Passwort"
          aria-label="Aktuelles Passwort"
          autoComplete="current-password"
          required
          className="jjk-mb-input"
        />
        <input
          name="password"
          type="password"
          placeholder="Neues Passwort (mind. 8 Zeichen)"
          aria-label="Neues Passwort (mind. 8 Zeichen)"
          autoComplete="new-password"
          minLength={8}
          maxLength={72}
          required
          className="jjk-mb-input"
        />
        <input
          name="password2"
          type="password"
          placeholder="Neues Passwort wiederholen"
          aria-label="Neues Passwort wiederholen"
          autoComplete="new-password"
          minLength={8}
          maxLength={72}
          required
          className="jjk-mb-input"
        />
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 sm:col-span-3">
          <button type="submit" disabled={pending} className="jjk-btn jjk-btn-sm disabled:opacity-50">
            {pending ? "Wird gespeichert…" : "Speichern"}
          </button>
          {state.error ? (
            <p role="alert" className="text-sm text-accent-bright">
              {state.error}
            </p>
          ) : null}
          {/* Vorher text-green-500: die einzige gruene Schrift der Seite. */}
          {state.ok ? (
            <p role="status" className="text-sm text-foreground">
              Passwort geändert.
            </p>
          ) : null}
        </div>
      </form>
    </section>
  );
}
