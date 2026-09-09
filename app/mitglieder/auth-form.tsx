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
      className="w-full max-w-md rounded-2xl p-8 shadow-2xl"
      style={{ background: "var(--card)" }}
    >
      <h1 className="text-3xl font-bold text-foreground mb-2">
        {mode === "login" ? "Einloggen" : "Registrieren"}
      </h1>
      <p className="text-sm text-foreground-dim mb-8">
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

      <form action={formAction} className="mb-6 flex flex-col gap-4">
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

      <p className="text-sm text-center text-foreground-dim">
        Probleme beim Einloggen?{" "}
        <span className="text-foreground font-medium">
          Trainer kontaktieren
        </span>
      </p>
    </motion.div>
  );
}

export default AuthForm;
