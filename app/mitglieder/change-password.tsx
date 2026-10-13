"use client";

import { useActionState, type ReactNode } from "react";
import { changePasswordAction, type ActionResult } from "./actions";

const initial: ActionResult & { ok?: boolean } = {};

const inputClass =
  "h-10 w-full rounded-md border border-white/15 bg-background/60 px-3 text-sm text-foreground placeholder:text-foreground-dim/60";

/** Eigenes Passwort aendern — eingeklappt unter dem Statusblock. */
export function ChangePassword(): ReactNode {
  const [state, action, pending] = useActionState(changePasswordAction, initial);
  return (
    <details className="mt-4 rounded-2xl border border-border bg-card-plate px-5 py-4 text-sm">
      <summary className="cursor-pointer text-foreground-dim hover:text-foreground">Passwort ändern</summary>
      <form action={action} className="mt-4 flex flex-col gap-2.5">
        <input name="current" type="password" placeholder="Aktuelles Passwort" autoComplete="current-password" required className={inputClass} />
        <input name="password" type="password" placeholder="Neues Passwort (mind. 8 Zeichen)" autoComplete="new-password" minLength={8} required className={inputClass} />
        <input name="password2" type="password" placeholder="Neues Passwort wiederholen" autoComplete="new-password" minLength={8} required className={inputClass} />
        {state.error ? <p className="text-accent">{state.error}</p> : null}
        {state.ok ? <p className="text-green-500">Passwort geändert.</p> : null}
        <button
          type="submit"
          disabled={pending}
          className="mt-1 h-10 rounded-md border border-border px-4 text-foreground hover:border-border-hot disabled:opacity-50"
        >
          {pending ? "Wird gespeichert…" : "Speichern"}
        </button>
      </form>
    </details>
  );
}
