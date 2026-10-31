"use client";

import { useActionState, type ReactNode } from "react";
import { setupPasswordAction, type ActionResult } from "@/app/mitglieder/actions";

const initial: ActionResult = {};

const inputClass =
  "w-full px-4 py-3 rounded-lg border-2 border-white/10 bg-background/60 text-foreground placeholder:text-foreground-dim/60 focus:outline-none focus:ring-2 focus:ring-accent/50 transition-all duration-200";

export function SetupForm({ token }: { token: string }): ReactNode {
  const [state, action, pending] = useActionState(setupPasswordAction, initial);
  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="token" value={token} />
      <input name="password" type="password" placeholder="Passwort (mind. 8 Zeichen)" autoComplete="new-password" minLength={8} maxLength={72} required className={inputClass} />
      <input name="password2" type="password" placeholder="Passwort wiederholen" autoComplete="new-password" minLength={8} maxLength={72} required className={inputClass} />
      {state.error ? <p className="text-sm text-accent">{state.error}</p> : null}
      <button
        type="submit"
        disabled={pending}
        className="mt-2 w-full rounded-lg px-6 py-3 font-medium transition-colors duration-200 disabled:opacity-50"
        style={{ background: "var(--accent)", color: "var(--accent-foreground)" }}
      >
        {pending ? "Wird gespeichert…" : "Passwort festlegen"}
      </button>
    </form>
  );
}
