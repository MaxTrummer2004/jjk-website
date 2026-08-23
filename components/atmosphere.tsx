"use client";

/**
 * Atmosphere — the global post-processing layer, done in CSS.
 *
 * Only a hard vignette sits above every section now.
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
          das ueberall auf der Seite auftauchte, nicht nur im Hero.

          Die Scanline (.jjk-scanline, repeating-linear-gradient alle 4px)
          ist jetzt auch raus: exakt das noch verbliebene "Streifen"-Muster,
          das auf jeder hellen/weissen Flaeche sichtbar war und die Seite nie
          richtig sauber weiss wirken liess — site-weit ueber allem, jede
          Sektion, jedes Bild. */}
      <div className="jjk-vignette" />
    </div>
  );
}

export default Atmosphere;
