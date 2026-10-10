"use client";

import { useActionState, useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { siteConfig } from "@/lib/config";
import { requestTrialAction, type TrialState } from "./actions";

/**
 * "Probetraining ausmachen" — ein Fenster mit kurzem Formular und dem
 * Hinweis auf Instagram. Geoeffnet wird es von jedem Knopf, der
 * openTrialDialog() aufruft (Hero, Abschluss-Sektion); dazwischen steht ein
 * Fenster-Ereignis statt eines React-Kontexts, weil die Knoepfe in voellig
 * verschiedenen Teilen des Baums sitzen.
 *
 * Der Instagram-Knopf erscheint nur, wenn siteConfig.social.instagram auf
 * ein echtes Profil zeigt — "https://instagram.com" allein ist der
 * Platzhalter aus der Vorlage und fuehrte nirgendwohin.
 */

const EVENT = "jjk:trial";

export function openTrialDialog(): void {
  window.dispatchEvent(new Event(EVENT));
}

const initial: TrialState = {};
const input =
  "w-full rounded-lg border-2 border-white/10 bg-background/60 px-4 py-2.5 text-foreground placeholder:text-foreground-dim/60 focus:border-accent/60 focus:outline-none";

function instagramUrl(): string | null {
  const url = siteConfig.social.instagram.replace(/\/+$/, "");
  return /instagram\.com\/[A-Za-z0-9_.]+$/.test(url) ? url : null;
}

export function TrialDialog(): ReactNode {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(requestTrialAction, initial);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const onOpen = (): void => setOpen(true);
    window.addEventListener(EVENT, onOpen);
    return () => window.removeEventListener(EVENT, onOpen);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    const prev = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    closeRef.current?.focus();
    return () => {
      window.removeEventListener("keydown", onKey);
      document.documentElement.style.overflow = prev;
    };
  }, [open]);

  if (!open || typeof document === "undefined") return null;
  const insta = instagramUrl();

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) setOpen(false);
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="trial-title"
        className="relative max-h-[90svh] w-full max-w-md overflow-y-auto rounded-2xl border border-border p-6 shadow-2xl sm:p-8"
        style={{ background: "var(--card)" }}
      >
        <button
          ref={closeRef}
          type="button"
          onClick={() => setOpen(false)}
          aria-label="Schließen"
          className="absolute top-4 right-4 rounded-full p-1.5 text-foreground-dim hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
        >
          <X className="size-5" />
        </button>

        <h2 id="trial-title" className="text-2xl font-semibold text-foreground">
          Probetraining ausmachen
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-foreground-dim">
          Das Probetraining ist gratis. Schreib uns kurz, wann du kommen willst &mdash; wir melden
          uns.
        </p>

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
    </div>,
    document.body
  );
}
