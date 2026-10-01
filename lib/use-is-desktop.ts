"use client";

import { useSyncExternalStore } from "react";

const QUERY = "(min-width: 768px)";

function subscribe(onChange: () => void): () => void {
  const mq = window.matchMedia(QUERY);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

/**
 * True, sobald der Viewport mindestens 768 px breit ist (Tailwinds `md`).
 *
 * Vorher ein useState mit einem Effekt, der beim Einhaengen sofort setState
 * rief — genau das Muster, vor dem react-hooks/set-state-in-effect warnt, und
 * hier ohne Not: useSyncExternalStore ist fuer diesen Fall gebaut. Es liefert
 * beim Rendern auf dem Server und beim Hydrieren `false`, wechselt danach auf
 * den echten Wert und bringt das Abmelden gleich mit. Ein Render weniger, ein
 * Zustand weniger, und die Hydrierung bleibt so widerspruchsfrei wie vorher.
 */
export function useIsDesktop(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(QUERY).matches,
    () => false,
  );
}
