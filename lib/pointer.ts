"use client";

/**
 * Womit gelesen wird — Zeiger oder Finger.
 *
 * ── Warum das eine eigene Abfrage ist und nicht die Bildschirmbreite ────────
 * Weil die Unterschiede, um die es hier geht, keine Frage der Breite sind. Ein
 * schmales Fenster auf einem Rechner hat immer noch einen Zeiger, der ueber
 * eine Wand fahren und sie beleuchten kann; ein breites Tablet hat keinen. Was
 * auf dieser Seite mobil anders laufen muss, haengt fast durchgehend daran:
 * die Fackel, die Bilder am Zeiger, das Ueberfahren von Knoepfen.
 *
 * `(hover: none) and (pointer: coarse)` ist die genaueste Beschreibung von
 * "Finger": kein Ueberfahren moeglich, grobe Zielgenauigkeit. Ein Rechner mit
 * Mausrad und Touchscreen faellt NICHT darunter, weil er `hover: hover` meldet
 * — und das ist richtig so, denn dort funktioniert die Zeigerfassung.
 *
 * ── Warum der Serverwert `false` ist ────────────────────────────────────────
 * Der Server weiss nicht, womit gelesen wird. `false` heisst: im ersten,
 * servergerenderten Bild gilt die Fassung fuer den Rechner. Auf dem Handy wird
 * unmittelbar danach umgestellt. Andersherum waere schlimmer — dann bekaeme
 * der Rechner fuer einen Moment die Handyfassung zu sehen.
 */

import { useSyncExternalStore } from "react";

export const TOUCH_QUERY = "(hover: none) and (pointer: coarse)";

function subscribe(onChange: () => void): () => void {
  const mq = window.matchMedia(TOUCH_QUERY);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

function getSnapshot(): boolean {
  return window.matchMedia(TOUCH_QUERY).matches;
}

function getServerSnapshot(): boolean {
  return false;
}

/** True, wenn mit dem Finger gelesen wird. */
export function useIsTouch(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
