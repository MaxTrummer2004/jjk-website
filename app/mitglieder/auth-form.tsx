"use client";

import { useActionState, type ReactNode } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { loginAction, type ActionResult } from "./actions";

const initialState: ActionResult = {};

const inputClass =
  "w-full px-4 py-3 rounded-lg border-2 border-white/10 bg-background/60 text-foreground placeholder:text-foreground-dim/60 focus:outline-none focus:ring-2 focus:ring-accent/50 transition-all duration-200";

/**
 * Login per E-Mail. Seit der Beitrittserklaerung (Oktober 2026) gibt es hier
 * keinen Registrieren-Modus mehr — wer noch kein Konto hat, landet ueber den
 * Link unten auf /beitreten.
 *
 * Ebenfalls raus: drei Knoepfe "Sign in with Google / Apple / GitHub" aus der
 * Vorlage. Sie hatten keinen Handler und taten nichts.
 */
export function AuthForm(): ReactNode {
  const [state, formAction, pending] = useActionState(loginAction, initialState);

  return (
    <motion.div
      initial={{ opacity: 0, x: -50 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.6 }}
      className="w-full max-w-md rounded-2xl p-5 sm:p-8 shadow-2xl max-h-[calc(100svh-3rem)] overflow-y-auto sm:max-h-none sm:overflow-visible"
      style={{ background: "var(--card)" }}
    >
      <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">Einloggen</h1>
      <p className="text-sm text-foreground-dim mb-5 sm:mb-8">
        Noch kein Mitglied?{" "}
        <Link href="/beitreten" className="text-foreground hover:text-accent font-medium">
          Beitrittserklärung ausfüllen
        </Link>
      </p>

      <form action={formAction} className="mb-5 sm:mb-6 flex flex-col gap-3 sm:gap-4">
        <input
          name="email"
          type="email"
          placeholder="E-Mail-Adresse"
          autoComplete="email"
          required
          className={inputClass}
        />
        <input
          name="password"
          type="password"
          placeholder="Passwort"
          autoComplete="current-password"
          required
          className={inputClass}
        />
        {/* Standard ist angehakt: der Normalfall ist das eigene Handy, und
            dort ist ein Login, der beim Schliessen des Browsers verfaellt,
            eine Zumutung. Wer an einem fremden Rechner sitzt, nimmt den Haken
            weg — dann endet das Cookie mit dem Fenster. */}
        <label className="flex items-center gap-2.5 text-sm text-muted-foreground">
          <input
            type="checkbox"
            name="remember"
            defaultChecked
            className="size-4 accent-[var(--accent)]"
          />
          Angemeldet bleiben
        </label>
        {state.error && <p className="text-sm text-accent">{state.error}</p>}
        <button
          type="submit"
          disabled={pending}
          className="w-full px-6 py-3 rounded-lg font-medium transition-colors duration-200 disabled:opacity-50"
          style={{ background: "var(--accent)", color: "var(--accent-foreground)" }}
        >
          {pending ? "Wird eingeloggt…" : "Einloggen"}
        </button>
      </form>

      <p className="text-xs sm:text-sm text-center text-foreground-dim">
        Passwort vergessen? Sag im Training Bescheid &mdash; der Vorstand setzt es zurück.
      </p>
    </motion.div>
  );
}

export default AuthForm;
