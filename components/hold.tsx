"use client";

/**
 * Hold — ein kurzer Halt, kein Riegel.
 *
 * ── Was es tut ──────────────────────────────────────────────────────────────
 * Beim Ankommen an einer Sektion bleibt sie einen Moment stehen, während der
 * Scroll weiterläuft. Der Leser wird nicht festgehalten — er scrollt normal
 * weiter, und was sich nicht bewegt, ist der Inhalt.
 *
 * Der Unterschied zu dem, was die erste Eröffnung dieser Seite gemacht hat, ist
 * genau dieser: die hat `overflow: hidden` gesetzt und Lenis gestoppt, also die
 * Seite eingefroren, bis eine Zeitschaltung sie freigab. Das war der Grund,
 * warum sie ersetzt wurde. Hier gibt es keine Sperre; es gibt nur einen
 * Abschnitt Scrollweg, in dem nichts Neues kommt.
 *
 * ── Warum das eine eigene Komponente ist und kein Wrapper ───────────────────
 * Weil sie NICHTS rendert. Die Wand darunter (components/lit-wall.tsx) hängt
 * an einer Kette aus Eltern-Kind-Beziehungen — `[data-lift]` hebt nur DIREKTE
 * Kinder über den Schleier —, und ein zusätzliches Element im Baum würde diese
 * Kette an genau der Stelle durchschneiden. Der Pin greift deshalb per
 * Selektor auf ein Element zu, das ohnehin schon da ist.
 *
 * ── Wenn es hakt ────────────────────────────────────────────────────────────
 * Ein Pin verschiebt alles, was darunter liegt, um seine eigene Länge. Sollte
 * dabei irgendwo etwas verrutschen, ist das eine Zeile in app/page.tsx und
 * nicht mehr: die Komponente entfernen, und die Seite ist wie vorher.
 */

import { useEffect, type ReactNode } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useReducedMotion } from "@/lib/motion";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

export interface HoldProps {
  /** CSS-Selektor des Elements, das stehenbleiben soll. */
  target: string;
  /** Wie lange, in Prozent der Fensterhöhe. */
  length?: number;
}

export function Hold({ target, length = 45 }: HoldProps): ReactNode {
  const reduced = useReducedMotion();

  useEffect(() => {
    // Unter reduzierter Bewegung gar nicht erst: ein Inhalt, der beim Scrollen
    // stehenbleibt, ist genau die Art von Bewegung, die dort abbestellt wurde.
    if (reduced) return;
    const el = document.querySelector<HTMLElement>(target);
    if (!el) return;

    const st = ScrollTrigger.create({
      trigger: el,
      start: "top top",
      end: "+=" + length + "%",
      pin: true,
      pinSpacing: true,
      // Ein Bild Vorlauf, damit der Pin nicht erst greift, wenn die Kante
      // schon vorbei ist. Bei smooth-scroll ohne das sichtbar als Ruck.
      anticipatePin: 1,
    });

    return () => st.kill();
  }, [target, length, reduced]);

  return null;
}

export default Hold;
