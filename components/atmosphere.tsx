"use client";

/**
 * Atmosphere — the global post-processing layer, done in CSS.
 *
 * Film grain, a hard vignette and a faint interlace scanline sit above every
 * section. Together with the chromatic-aberration text utilities this is what
 * makes the page read as a frame from the opening rather than a normal site.
 */

import type { ReactNode } from "react";
import { useReducedMotion } from "@/lib/motion";

export function Atmosphere(): ReactNode {
  const prefersReducedMotion = useReducedMotion();

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-[80]">
      {/* Warm wash over the whole page. Flat on purpose — the radial version
          this replaces pooled the red at the bottom centre of every viewport. */}
      <div
        className="pointer-events-none fixed inset-0"
        style={{ background: "rgba(255,106,31,0.035)" }}
      />
      <div className="jjk-vignette" />
      <div className="jjk-scanline" />
      <div
        className="jjk-grain"
        style={prefersReducedMotion ? { animation: "none" } : undefined}
      />
    </div>
  );
}

export default Atmosphere;
