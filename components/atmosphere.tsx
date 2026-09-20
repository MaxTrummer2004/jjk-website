"use client";

/**
 * Atmosphere — the global post-processing layer, done in CSS.
 *
 * Only a hard vignette sits above every section now.
 */

import { useEffect, useRef, type ReactNode } from "react";

/**
 * Welche Sektionen die Vignette aussparen soll.
 *
 * Hintergrund: die Vignette liegt als `position: fixed` ueber dem GANZEN
 * Viewport und dunkelt ab 48 % Radius bis rgba(3,3,4,0.6) in den Ecken ab.
 * Das Trainer-Karussell ist full-bleed, die aeusseren Karten sitzen also
 * genau in der dunkelsten Zone — auch aufgehellte Fotos kamen dort wieder
 * dunkel an.
 *
 * Die Sektion nach oben aus der Vignette herauszuheben (z-index) geht nicht:
 * die Navigation liegt auf z-50, also UNTER der Vignette (z-80). Eine Sektion
 * ueber z-80 wuerde beim Scrollen ueber den Header laufen. Deshalb bekommt
 * stattdessen die Vignette selbst ein Loch, per CSS-Maske, dessen Kanten in
 * Viewport-Prozent aus der Position der Sektion nachgefuehrt werden.
 */
const CUTOUT_SELECTOR = "#coaches";

export function Atmosphere(): ReactNode {
  const vignetteRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = vignetteRef.current;
    if (!el) return;

    // `mask-image` auf einem fixed Element, das den ganzen Viewport
    // ueberzieht, ist eine reine Compositing-Operation — kein Layout, kein
    // Paint der darunterliegenden Sektionen. Die beiden Kanten werden als
    // Custom Properties geschrieben und nur dann, wenn sie sich wirklich
    // geaendert haben, damit ein Scroll ohne Coaches im Bild gar nichts tut.
    let frame = 0;
    let lastTop = -1;
    let lastBottom = -1;

    const measure = (): void => {
      frame = 0;
      const section = document.querySelector(CUTOUT_SELECTOR);
      const vh = window.innerHeight || 1;

      // Ausserhalb des Bildes: Loch nach unten aus dem Viewport schieben,
      // dann ist die Maske durchgehend deckend und die Vignette voll da.
      let top = 100;
      let bottom = 100;

      if (section) {
        const r = section.getBoundingClientRect();
        if (r.bottom > 0 && r.top < vh) {
          top = (r.top / vh) * 100;
          bottom = (r.bottom / vh) * 100;
        }
      }

      if (top === lastTop && bottom === lastBottom) return;
      lastTop = top;
      lastBottom = bottom;
      el.style.setProperty("--jjk-vignette-hole-top", `${top}%`);
      el.style.setProperty("--jjk-vignette-hole-bottom", `${bottom}%`);
    };

    const schedule = (): void => {
      if (frame) return;
      frame = requestAnimationFrame(measure);
    };

    measure();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, []);

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-[80]">
      {/* Der warme Wash (rgba(255,106,31,...) flach ueber der ganzen Seite)
          ist komplett raus — fiel als Farbstich auf echtem Videomaterial und
          allgemein auf der Seite auf, per Wunsch site-weit entfernt statt nur
          bedingt ausgeblendet.

          Das Film-Korn (.jjk-grain, animiertes SVG-feTurbulence-Rauschen mit
          mix-blend-mode: overlay) ist ebenfalls komplett raus — auf echten
          mobilen Geraeten (v.a. iOS Safari) sind solche SVG-Filter dafuer
          bekannt, statt sauberem Rauschen sichtbare farbige Streifen/Baender
          zu erzeugen statt Grau — genau das rote "Raster/Streifen"-Muster,
          das ueberall auf der Seite auftauchte, nicht nur im Hero.

          Die Scanline (.jjk-scanline, repeating-linear-gradient alle 4px)
          ist jetzt auch raus: exakt das noch verbliebene "Streifen"-Muster,
          das auf jeder hellen/weissen Flaeche sichtbar war und die Seite nie
          richtig sauber weiss wirken liess — site-weit ueber allem, jede
          Sektion, jedes Bild. */}
      <div ref={vignetteRef} className="jjk-vignette" />
    </div>
  );
}

export default Atmosphere;
