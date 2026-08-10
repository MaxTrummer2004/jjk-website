"use client";

/**
 * VeilBreak — derselbe Nebel wie am Ende des Heros, mitten auf der Seite.
 *
 * ── Was es tut ─────────────────────────────────────────────────────────────
 * Eine klebende, bildschirmhohe Ebene UEBER allem, die beim Heranscrollen an
 * eine Sektion den Grund in Schwaden zudeckt und danach wieder aufgeht. Auf
 * halbem Weg ist der Schirm schwarz; was danach dasteht, ist die neue Sektion,
 * und dazwischen war nie eine Kante zu sehen.
 *
 * Beides gehoert zusammen, und keins von beidem geht allein: eine Ebene, die
 * nur zudeckt, bleibt am Ende als schwarze Flaeche vor dem stehen, was sie
 * freigeben sollte — und eine Ebene, die hinter ihrem Ziel liegt, deckt
 * ueberhaupt nichts zu. Beides ist hier passiert, bevor es so dastand.
 *
 * Es ist wortwoertlich derselbe Uebergang wie zwischen Hero und erster
 * Sektion: dieselbe Luma-Karte, derselbe Shader, dieselbe Rechnung. Nur der
 * Ausloeser ist ein anderer — dort das Ende der Hero-Buehne, hier das
 * Herankommen der naechsten Tafel.
 *
 * ── Warum es keinen Platz belegt ───────────────────────────────────────────
 * `margin-bottom: -100svh` hebt die eigene Hoehe wieder auf. Die Ebene ist
 * eine Beleuchtung, kein Abschnitt: sie soll nichts verschieben, was unter ihr
 * liegt. Dieselbe Konstruktion wie bei `.jjk-plate-room`.
 *
 * ── Warum der Trigger auf ein anderes Element zeigt ────────────────────────
 * Weil die Ebene selbst keine Hoehe im Fluss hat und ein Trigger auf ihr
 * deshalb keine brauchbaren Grenzen haette. Gemessen wird an dem, worauf der
 * Uebergang zulaeuft — die Sektion dahinter —, und zwar von dem Moment, in dem
 * deren Oberkante unten ins Bild kommt, bis zu dem, in dem sie oben ankommt.
 */

import { useEffect, useRef, type ReactNode } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { VeilCanvas, type VeilCanvasHandle } from "@/components/veil-canvas";
import { useReducedMotion } from "@/lib/motion";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

export interface VeilBreakProps {
  /** CSS-Selektor der Sektion, auf die der Uebergang zulaeuft. */
  target: string;
  className?: string;
}

export function VeilBreak({ target, className = "" }: VeilBreakProps): ReactNode {
  const reduced = useReducedMotion();
  const veil = useRef<VeilCanvasHandle>(null);

  useEffect(() => {
    // Unter reduzierter Bewegung deckt nichts zu und nichts loest sich auf.
    // Der Grund darunter ist ohnehin abgedunkelt — siehe .jjk-plate-close.
    if (reduced) return;
    const el = document.querySelector<HTMLElement>(target);
    if (!el) return;

    const st = ScrollTrigger.create({
      trigger: el,
      start: "top bottom",
      end: "top top",
      scrub: true,
      invalidateOnRefresh: true,
      onUpdate: (self) => {
        // Ein Dreieck und keine Rampe: der Nebel kommt, deckt zu, und geht
        // wieder auf. Eine Rampe waere nur die halbe Bewegung — sie deckt zu
        // und BLEIBT, und dann steht der Nebel fuer immer vor der Tafel, die
        // er freigeben sollte.
        //
        // Der Scheitel liegt auf halbem Weg, also wenn die Oberkante der Tafel
        // in der Mitte des Schirms steht: dort ist alles schwarz. Bis sie oben
        // ankommt, ist der Nebel wieder weg und die Tafel steht formatfuellend
        // da.
        const p = self.progress;
        veil.current?.set(p < 0.5 ? p * 2 : (1 - p) * 2);
      },
    });

    return () => st.kill();
  }, [target, reduced]);

  return (
    <div className={`jjk-veil-break ${className}`} aria-hidden="true">
      <VeilCanvas ref={veil} className="jjk-veil-break-canvas" />
    </div>
  );
}

export default VeilBreak;
