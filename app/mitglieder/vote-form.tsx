"use client";

import { useActionState, type ReactNode } from "react";
import { voteAction, type ActionResult } from "./actions";

const initialState: ActionResult = {};

/**
 * "War ich da?" — Abstimmung fuer den juengsten Trainingstag. Zeigt den
 * aktuell gespeicherten Stand (falls schon abgestimmt) und erlaubt, ihn
 * jederzeit zu aendern (z. B. wenn man sich vertan hat).
 */
export function VoteForm({
  trainingDateLabel,
  currentVote,
}: {
  trainingDateLabel: string;
  currentVote: boolean | null;
}): ReactNode {
  const [state, formAction, pending] = useActionState(voteAction, initialState);

  return (
    <div className="rounded-3xl border border-accent/25 bg-card p-5 sm:p-6">
      <p className="text-sm font-medium text-foreground-dim">
        {currentVote === null ? "War da:" : "Wart da:"}{" "}
        <span className="text-foreground">{trainingDateLabel}</span>
      </p>
      <div className="mt-3 flex gap-3">
        <form action={formAction} className="flex-1">
          <input type="hidden" name="present" value="true" />
          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-full py-3 text-sm font-medium transition-opacity hover:opacity-85 disabled:opacity-50"
            style={
              currentVote === true
                ? { backgroundColor: "var(--accent)", color: "var(--accent-foreground)" }
                : { backgroundColor: "var(--card-raised)", color: "var(--foreground)" }
            }
          >
            ✅ War da
          </button>
        </form>
        <form action={formAction} className="flex-1">
          <input type="hidden" name="present" value="false" />
          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-full py-3 text-sm font-medium transition-opacity hover:opacity-85 disabled:opacity-50"
            style={
              currentVote === false
                ? { backgroundColor: "var(--accent)", color: "var(--accent-foreground)" }
                : { backgroundColor: "var(--card-raised)", color: "var(--foreground)" }
            }
          >
            ❌ War nicht da
          </button>
        </form>
      </div>
      {state.error && <p className="mt-2 text-sm text-accent">{state.error}</p>}
    </div>
  );
}

export default VoteForm;
