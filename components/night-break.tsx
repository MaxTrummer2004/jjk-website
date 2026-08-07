"use client";

/**
 * NightBreak — the flash that goes with the night striking on.
 *
 * The switch itself is not here: it is a stepped `opacity` animation on the
 * night group in CityBackdrop. This only adds the warm flash that fires on each
 * strike, so the cuts land with some weight instead of being a bare toggle.
 */

import type { CSSProperties, ReactNode } from "react";

export interface NightBreakProps {
  /** Seconds the dusk frame holds before the first flicker. */
  hold?: number;
  /** Seconds the whole flicker takes. Must match the night group. */
  burst?: number;
}

export function NightBreak({ hold = 2.4, burst = 1.4 }: NightBreakProps): ReactNode {
  const vars = {
    "--break-hold": `${hold}s`,
    "--break-dur": `${burst}s`,
  } as CSSProperties;

  return (
    <div className="jjk-break" style={vars} aria-hidden="true">
      <div className="jjk-break-flash" />
    </div>
  );
}

export default NightBreak;
