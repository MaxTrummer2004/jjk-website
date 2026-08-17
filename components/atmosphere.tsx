"use client";

/**
 * Atmosphere — the global post-processing layer, done in CSS.
 *
 * Film grain, a hard vignette and a faint interlace scanline sit above every
 * section. Together with the chromatic-aberration text utilities this is what
 * makes the page read as a frame from the opening rather than a normal site.
 */

import type { ReactNode } from "react";

export function Atmosphere(): ReactNode {
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
          das ueberall auf der Seite auftauchte, nicht nur im Hero. */}
      <div className="jjk-vignette" />
      <div className="jjk-scanline" />
    </div>
  );
}

export default Atmosphere;
