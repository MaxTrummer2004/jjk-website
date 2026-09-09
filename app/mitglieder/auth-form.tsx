"use client";

import { useActionState, useState, type ReactNode } from "react";
import { motion } from "motion/react";
import { loginAction, registerAction, type ActionResult } from "./actions";

const initialState: ActionResult = {};

const inputClass =
  "w-full px-4 py-3 rounded-lg border-2 border-white/10 bg-background/60 text-foreground placeholder:text-foreground-dim/60 focus:outline-none focus:ring-2 focus:ring-accent/50 transition-all duration-200";

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
  const pending = mode === "login" ? loginPending : registerPending;
  const formAction = mode === "login" ? loginFormAction : registerFormAction;

  return (
    <motion.div
      initial={{ opacity: 0, x: -50 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.6 }}
      className="w-full max-w-md rounded-2xl p-5 sm:p-8 shadow-2xl max-h-[calc(100svh-3rem)] overflow-y-auto sm:max-h-none sm:overflow-visible"
      style={{ background: "var(--card)" }}
    >
      <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">
        {mode === "login" ? "Einloggen" : "Registrieren"}
      </h1>
      <p className="text-sm text-foreground-dim mb-5 sm:mb-8">
        {mode === "login" ? (
          <>
            Noch kein Konto?{" "}
            <button
              type="button"
              onClick={() => setMode("register")}
              className="text-foreground hover:text-foreground-dim font-medium"
            >
              Jetzt registrieren
            </button>
          </>
        ) : (
          <>
            Schon registriert?{" "}
            <button
              type="button"
              onClick={() => setMode("login")}
              className="text-foreground hover:text-foreground-dim font-medium"
            >
              Einloggen
            </button>
          </>
        )}
      </p>

      <form action={formAction} className="mb-5 sm:mb-6 flex flex-col gap-3 sm:gap-4">
        {mode === "register" && (
          <input
            name="name"
            placeholder="Dein Name (für die Rangliste)"
            autoComplete="name"
            required
            className={inputClass}
          />
        )}
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
          placeholder={mode === "login" ? "Passwort" : "Passwort (min. 6 Zeichen)"}
          autoComplete={mode === "login" ? "current-password" : "new-password"}
          required
          minLength={mode === "register" ? 6 : undefined}
          className={inputClass}
        />
        {state.error && (
          <p className="text-sm text-accent">{state.error}</p>
        )}
        <button
          type="submit"
          disabled={pending}
          className="w-full px-6 py-3 rounded-lg font-medium transition-colors duration-200 disabled:opacity-50"
          style={{ background: "var(--accent)", color: "var(--accent-foreground)" }}
        >
          {pending
            ? mode === "login" ? "Wird eingeloggt…" : "Wird erstellt…"
            : mode === "login" ? "Einloggen" : "Konto erstellen"}
        </button>
      </form>

      {/* OR-Divider */}
      <div className="flex items-center gap-4 mb-4 sm:mb-6">
        <div className="h-px flex-1 bg-border" />
        <span className="text-sm text-muted-foreground">Oder</span>
        <div className="h-px flex-1 bg-border" />
      </div>

      {/* OAuth-Buttons */}
      <div className="mb-3 sm:mb-4 space-y-2 sm:space-y-3">
        <button
          type="button"
          className="flex w-full items-center justify-center gap-3 rounded-lg border border-border bg-card-raised px-6 py-3 text-sm font-medium tracking-tight text-foreground transition-colors duration-200 hover:border-border-hot"
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            <path d="M1 1h22v22H1z" fill="none" />
          </svg>
          Sign in with Google
        </button>

        <button
          type="button"
          className="flex w-full items-center justify-center gap-3 rounded-lg border border-border bg-card-raised px-6 py-3 text-sm font-medium tracking-tight text-foreground transition-colors duration-200 hover:border-border-hot"
        >
          <svg className="h-5 w-5" viewBox="0 0 814 1000" fill="currentColor">
            <path d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76.5 0-103.7 40.8-165.9 40.8s-105.6-57-155.5-127C46.7 790.7 0 663 0 541.8c0-194.4 126.4-297.5 250.8-297.5 66.1 0 121.2 43.4 162.7 43.4 39.5 0 101.1-46 176.3-46 28.5 0 130.9 2.6 198.3 99.2zm-234-181.5c31.1-36.9 53.1-88.1 53.1-139.3 0-7.1-.6-14.3-1.9-20.1-50.6 1.9-110.8 33.7-147.1 75.8-28.5 32.4-55.1 83.6-55.1 135.5 0 7.8 1.3 15.6 1.9 18.1 3.2.6 8.4 1.3 13.6 1.3 45.4 0 102.5-30.4 135.5-71.3z" />
          </svg>
          Sign in with Apple
        </button>

        <button
          type="button"
          className="flex w-full items-center justify-center gap-3 rounded-lg border border-border bg-card-raised px-6 py-3 text-sm font-medium tracking-tight text-foreground transition-colors duration-200 hover:border-border-hot"
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
          </svg>
          Sign in with GitHub
        </button>
      </div>

      <p className="text-xs sm:text-sm text-center text-foreground-dim">
        Probleme beim Einloggen?{" "}
        <span className="text-foreground font-medium">
          Trainer kontaktieren
        </span>
      </p>
    </motion.div>
  );
}

export default AuthForm;
