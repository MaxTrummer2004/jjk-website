"use client";

import { useActionState, type ReactNode } from "react";
import { siteConfig } from "@/lib/config";
import { requestTrialAction, type TrialState } from "./actions";

/**
 * Das Probetraining-Formular samt Instagram-Knopf — seit 11.10.2026 auf
 * einer eigenen Seite (/probetraining) statt in einem Fenster ueber der
 * Startseite. Gespeichert wird ueber requestTrialAction (actions.ts).
 *
 * Der Instagram-Knopf erscheint nur, wenn siteConfig.social.instagram auf
 * ein echtes Profil zeigt.
 */

const initial: TrialState = {};
const input =
  "w-full rounded-lg border-2 border-white/10 bg-background/60 px-4 py-2.5 text-foreground placeholder:text-foreground-dim/60 focus:border-accent/60 focus:outline-none";

function instagramUrl(): string | null {
  const url = siteConfig.social.instagram.replace(/\/+$/, "");
  return /instagram\.com\/[A-Za-z0-9_.]+$/.test(url) ? url : null;
}

export function TrialForm(): ReactNode {
  const [state, action, pending] = useActionState(requestTrialAction, initial);
  const insta = instagramUrl();

  return (
    <div>
        {insta ? (
        <a
          href={insta}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-full border border-accent/60 px-5 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-accent hover:text-white"
        >
          Am schnellsten: Nachricht auf Instagram
        </a>
      ) : null}

      {state.ok ? (
        <p role="status" className="mt-6 rounded-lg border border-green-600/50 bg-green-600/15 px-4 py-3 text-sm text-foreground">
          Danke! Deine Anfrage ist angekommen, wir melden uns bei dir.
        </p>
      ) : (
        <form action={action} className="mt-6 flex flex-col gap-3">
          {insta ? (
            <p className="text-center text-xs uppercase tracking-[0.16em] text-muted-foreground">
              oder hier
            </p>
          ) : null}
          <label className="flex flex-col gap-1 text-sm text-foreground">
            Name
            <input name="name" required autoComplete="name" className={input} />
          </label>
          <label className="flex flex-col gap-1 text-sm text-foreground">
            Wie erreichen wir dich?
            <input
              name="contact"
              required
              placeholder="E-Mail, Telefon oder Instagram-Name"
              className={input}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-foreground">
            Wunschtag <span className="text-foreground-dim">(optional)</span>
            <select name="day" defaultValue="" className={input}>
              <option value="">egal</option>
              <option value="Mo">Montag</option>
              <option value="Di">Dienstag</option>
              <option value="Mi">Mittwoch</option>
              <option value="Do">Donnerstag</option>
              <option value="Fr">Freitag</option>
              <option value="Sa">Samstag</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm text-foreground">
            Nachricht <span className="text-foreground-dim">(optional)</span>
            <textarea name="message" rows={3} maxLength={1000} className={input} />
          </label>
          {/* Honigtopf gegen Bots: fuer Menschen unsichtbar und nicht fokussierbar. */}
          <input
            name="website"
            tabIndex={-1}
            autoComplete="off"
            aria-hidden="true"
            className="absolute left-[-9999px] h-0 w-0 opacity-0"
          />
          {state.error ? <p className="text-sm text-accent">{state.error}</p> : null}
          <button type="submit" disabled={pending} className="jjk-btn jjk-btn-loud mt-2 disabled:opacity-50">
            {pending ? "Wird gesendet…" : "Anfrage senden"}
          </button>
          <p className="text-xs leading-relaxed text-foreground-dim">
            Wir verwenden deine Angaben nur, um dir zu antworten. Mehr in der{" "}
            <a href="/datenschutz" className="underline">
              Datenschutzerklärung
            </a>
            .
          </p>
        </form>
      )}
    </div>
  );
}
