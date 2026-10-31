"use client";

import { useActionState, type ReactNode } from "react";
import { voteAction, type ActionResult } from "./actions";

const initialState: ActionResult = {};

/**
 * "War ich da?" — Abstimmung fuer den juengsten Trainingstag. Zeigt den
 * aktuell gespeicherten Stand (falls schon abgestimmt) und erlaubt, ihn
 * jederzeit zu aendern (z. B. wenn man sich vertan hat).
 *
 * Seit 31.10.2026 der erste Block der Seite statt der letzte, und eine Platte
 * statt einer Karte mit rounded-3xl. Solange fuer den Tag noch nicht
 * abgestimmt ist, traegt sie die Glutkante (data-due) wie ein offener
 * Beitrag: beides heisst "hier fehlt noch etwas von dir".
 */
export function VoteForm({
  trainingDateLabel,
  isToday,
  currentVote,
}: {
  trainingDateLabel: string;
  isToday: boolean;
  currentVote: boolean | null;
}): ReactNode {
  const [state, formAction, pending] = useActionState(voteAction, initialState);

  // Vorher "War da:" bzw. "Wart da:" — Tippfehler, und nach "War nicht da"
  // stand trotzdem "da" (31.10.2026). Jetzt Frage, solange offen, danach der
  // gespeicherte Stand in beide Richtungen. "heute" nur, wenn der Tag auch
  // heute IST: am Sonntag gilt die Abstimmung dem Samstag (lib/attendance.ts,
  // currentVoteDay), und "Warst du heute da? 31.10." am 1.11. waere falsch.
  const question =
    currentVote === null
      ? isToday
        ? "Warst du heute da?"
        : "Warst du da?"
      : currentVote
        ? "Warst da:"
        : "Warst nicht da:";

  return (
    <section
      aria-labelledby="abstimmung-title"
      className="jjk-mb-plate p-5 sm:p-7"
      data-due={currentVote === null ? "" : undefined}
    >
      <p className="jjk-mb-eyebrow">Abstimmung</p>
      <h2
        id="abstimmung-title"
        className="mt-3 font-display text-[1.65rem] font-bold leading-tight text-foreground sm:text-[2rem]"
      >
        {question} <span className="whitespace-nowrap text-foreground-dim">{trainingDateLabel}</span>
      </h2>
      <div className="mt-5 grid grid-cols-2 gap-3 sm:mt-6">
        <form action={formAction}>
          <input type="hidden" name="present" value="true" />
          <button
            type="submit"
            disabled={pending}
            aria-pressed={currentVote === true}
            className="jjk-btn jjk-mb-vote-btn"
          >
            War da
          </button>
        </form>
        <form action={formAction}>
          <input type="hidden" name="present" value="false" />
          <button
            type="submit"
            disabled={pending}
            aria-pressed={currentVote === false}
            className="jjk-btn jjk-mb-vote-btn"
          >
            War nicht da
          </button>
        </form>
      </div>
      {state.error ? (
        <p role="alert" className="mt-3 text-sm text-accent-bright">
          {state.error}
        </p>
      ) : null}
    </section>
  );
}

export default VoteForm;
