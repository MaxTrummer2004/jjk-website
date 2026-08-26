"use client";

import { useActionState, useState, type ReactNode } from "react";
import { loginAction, registerAction, type ActionResult } from "./actions";

const initialState: ActionResult = {};

const inputClass =
  "w-full rounded-xl border border-white/10 bg-background/60 px-4 py-3 text-sm text-foreground placeholder:text-foreground-dim/60 outline-none transition-colors focus:border-accent/60";

/**
 * Login + Registrierung in einem Formular (Tab-Umschalter statt zweier
 * Seiten) — kein E-Mail-Feld, wie gewuenscht: nur Name (fuer die Rangliste),
 * Benutzername und Passwort.
 */
export function AuthForm(): ReactNode {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [loginState, loginFormAction, loginPending] = useActionState(
    loginAction,
    initialState
  );
  const [registerState, registerFormAction, registerPending] = useActionState(
    registerAction,
    initialState
  );

  const state = mode === "login" ? loginState : registerState;

  return (
    <div className="mx-auto w-full max-w-sm rounded-3xl border border-white/10 bg-card p-6 sm:p-8">
      <div className="mb-6 flex rounded-full border border-white/10 bg-background/60 p-1 text-sm font-medium">
        <button
          type="button"
          onClick={() => setMode("login")}
          className="flex-1 rounded-full py-2 transition-colors"
          style={
            mode === "login"
              ? { backgroundColor: "var(--accent)", color: "var(--accent-foreground)" }
              : { color: "var(--foreground-dim)" }
          }
        >
          Login
        </button>
        <button
          type="button"
          onClick={() => setMode("register")}
          className="flex-1 rounded-full py-2 transition-colors"
          style={
            mode === "register"
              ? { backgroundColor: "var(--accent)", color: "var(--accent-foreground)" }
              : { color: "var(--foreground-dim)" }
          }
        >
          Registrieren
        </button>
      </div>

      {mode === "login" ? (
        <form action={loginFormAction} className="flex flex-col gap-3">
          <input
            name="username"
            placeholder="Benutzername"
            autoComplete="username"
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
          {state.error && (
            <p className="text-sm text-accent">{state.error}</p>
          )}
          <button
            type="submit"
            disabled={loginPending}
            className="mt-2 rounded-full py-3 text-sm font-medium transition-opacity hover:opacity-85 disabled:opacity-50"
            style={{ backgroundColor: "var(--accent)", color: "var(--accent-foreground)" }}
          >
            {loginPending ? "Lädt…" : "Einloggen"}
          </button>
        </form>
      ) : (
        <form action={registerFormAction} className="flex flex-col gap-3">
          <input
            name="name"
            placeholder="Dein Name (für die Rangliste)"
            autoComplete="name"
            required
            className={inputClass}
          />
          <input
            name="username"
            placeholder="Benutzername"
            autoComplete="username"
            required
            className={inputClass}
          />
          <input
            name="password"
            type="password"
            placeholder="Passwort (min. 6 Zeichen)"
            autoComplete="new-password"
            required
            minLength={6}
            className={inputClass}
          />
          {state.error && (
            <p className="text-sm text-accent">{state.error}</p>
          )}
          <button
            type="submit"
            disabled={registerPending}
            className="mt-2 rounded-full py-3 text-sm font-medium transition-opacity hover:opacity-85 disabled:opacity-50"
            style={{ backgroundColor: "var(--accent)", color: "var(--accent-foreground)" }}
          >
            {registerPending ? "Lädt…" : "Konto erstellen"}
          </button>
        </form>
      )}
    </div>
  );
}

export default AuthForm;
