"use client";

import { useActionState, type ReactNode } from "react";
import { resetPasswordAction, type ResetState } from "./actions";

const initial: ResetState = {};

export function ResetPassword({ memberId }: { memberId: number }): ReactNode {
  const [state, action, pending] = useActionState(resetPasswordAction, initial);
  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="member_id" value={memberId} />
      <input
        name="password"
        type="text"
        minLength={8}
        required
        placeholder="Neues Passwort"
        autoComplete="off"
        className="h-9 w-44 rounded-md border border-white/15 bg-background/60 px-3 text-sm text-foreground"
      />
      <button
        type="submit"
        disabled={pending}
        className="h-9 rounded-md border border-border px-3 text-sm text-foreground hover:border-border-hot disabled:opacity-50"
      >
        Setzen
      </button>
      {state.message ? <span className="text-sm text-green-500">{state.message}</span> : null}
      {state.error ? <span className="text-sm text-accent">{state.error}</span> : null}
    </form>
  );
}
