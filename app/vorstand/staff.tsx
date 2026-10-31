"use client";

import { useActionState, useState, type ReactNode } from "react";
import { createStaffAction, newSetupLinkAction, type StaffState } from "./actions";

const initial: StaffState = {};

const inputClass =
  "h-10 w-full rounded-md border border-white/15 bg-background/60 px-3 text-sm text-foreground placeholder:text-foreground-dim/60";

function LinkBox({ name, link }: { name?: string | undefined; link: string }): ReactNode {
  const [copied, setCopied] = useState(false);
  return (
    <div className="mt-3 rounded-lg border border-border bg-background/60 p-3 text-sm">
      <p className="text-foreground-dim">
        Link für {name ?? "das Konto"}. Schick ihn weiter, damit wird das Passwort festgelegt. Er gilt einmal und 72 Stunden lang.
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <code className="min-w-0 flex-1 break-all text-foreground">{link}</code>
        <button
          type="button"
          onClick={() => {
            void navigator.clipboard?.writeText(link).then(() => setCopied(true));
          }}
          className="h-9 rounded-md border border-border px-3 text-foreground hover:border-border-hot"
        >
          {copied ? "Kopiert" : "Kopieren"}
        </button>
      </div>
    </div>
  );
}

/** Formular: beitragsfreies Konto fuer Trainer/Vorstand anlegen. */
export function CreateStaff(): ReactNode {
  const [state, action, pending] = useActionState(createStaffAction, initial);
  return (
    <div className="rounded-xl border border-border bg-card-plate p-4">
      <p className="text-sm font-medium text-foreground">Konto für Trainer oder Vorstand anlegen</p>
      <p className="mt-1 text-sm text-foreground-dim">
        Beitragsfrei und sofort aktiv.
      </p>
      <form action={action} className="mt-3 grid gap-2 sm:grid-cols-[1fr_1fr_1.4fr_auto]">
        <input name="first_name" placeholder="Vorname" required className={inputClass} />
        <input name="last_name" placeholder="Nachname" required className={inputClass} />
        <input name="email" type="email" placeholder="E-Mail" required className={inputClass} />
        <button
          type="submit"
          disabled={pending}
          className="jjk-btn jjk-btn-loud h-10 px-4 text-sm disabled:opacity-50"
        >
          Anlegen
        </button>
      </form>
      {state.error ? <p className="mt-2 text-sm text-accent">{state.error}</p> : null}
      {state.link ? <LinkBox name={state.name} link={state.link} /> : null}
    </div>
  );
}

/** Neuen Einrichtungslink fuer ein bestehendes Konto. */
export function NewSetupLink({ memberId }: { memberId: number }): ReactNode {
  const [state, action, pending] = useActionState(newSetupLinkAction, initial);
  return (
    <div>
      <form action={action}>
        <input type="hidden" name="member_id" value={memberId} />
        <button
          type="submit"
          disabled={pending}
          className="h-9 rounded-md border border-border px-3 text-sm text-foreground hover:border-border-hot disabled:opacity-50"
        >
          Neuen Einrichtungslink erzeugen
        </button>
      </form>
      {state.error ? <p className="mt-2 text-sm text-accent">{state.error}</p> : null}
      {state.link ? <LinkBox name={state.name} link={state.link} /> : null}
    </div>
  );
}
