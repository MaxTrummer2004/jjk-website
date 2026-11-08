"use client";

import { Eye, EyeOff } from "lucide-react";
import { forwardRef, useState, type InputHTMLAttributes } from "react";

/**
 * Passwortfeld mit Augen-Knopf (08.11.2026): ein Klick zeigt das Passwort im
 * Klartext, ein zweiter versteckt es wieder. Auch vom Browser gespeicherte
 * und automatisch eingefuellte Passwoerter werden so sichtbar.
 * autoComplete bleibt unveraendert, damit der Passwortmanager das Feld
 * weiterhin erkennt und anbietet, die Zugangsdaten zu speichern.
 */
export const PasswordInput = forwardRef<HTMLInputElement, Omit<InputHTMLAttributes<HTMLInputElement>, "type">>(
  function PasswordInput({ className, style, ...props }, ref) {
    const [visible, setVisible] = useState(false);
    return (
      <div className="relative w-full">
        <input
          ref={ref}
          {...props}
          type={visible ? "text" : "password"}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          className={`jjk-pw-input ${className ?? ""}`}
          style={{ ...style, paddingRight: "3rem" }}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "Passwort verbergen" : "Passwort anzeigen"}
          aria-pressed={visible}
          title={visible ? "Passwort verbergen" : "Passwort anzeigen"}
          className="text-foreground-dim hover:text-foreground focus-visible:ring-accent/50 absolute top-1/2 right-1.5 flex size-9 -translate-y-1/2 items-center justify-center rounded-md transition-colors focus-visible:ring-2 focus-visible:outline-none"
        >
          {visible ? <EyeOff className="size-[18px]" aria-hidden /> : <Eye className="size-[18px]" aria-hidden />}
        </button>
      </div>
    );
  },
);
