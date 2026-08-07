"use client";

/**
 * CursedEnergy — the ambient layer over the hero.
 *
 * Sparse embers rising and swaying, each on its own duration and phase.
 *
 * There used to be three big drifting red wisps in here as well. They were
 * removed: however far they were blurred and faded, a large soft blob still
 * puts more red in one corner than another, and the hero is supposed to read
 * evenly lit. Local haze and an even frame are not reconcilable — the haze had
 * to go.
 *
 * Everything animates `transform` and `opacity` only, so this stays on the
 * compositor and never touches layout. No canvas: the site already spends its
 * one WebGL context on the pointer plume.
 *
 * Particle positions come from a seeded PRNG rather than Math.random so server
 * and client render identical markup.
 */

import { useMemo, type CSSProperties, type ReactNode } from "react";

function makeRandom(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

interface Ember {
  left: number;
  size: number;
  duration: number;
  delay: number;
  drift: number;
  opacity: number;
}

export interface CursedEnergyProps {
  /** How many embers. Keep it low — they are DOM nodes, not particles. */
  count?: number;
  /**
   * Seconds before the embers appear. Held back until the night has struck:
   * glowing cinders drifting over a daylight photograph read as a mistake.
   */
  delay?: number;
  className?: string;
}

export function CursedEnergy({
  count = 18,
  delay = 0,
  className = "",
}: CursedEnergyProps): ReactNode {
  const embers = useMemo<Ember[]>(() => {
    const rnd = makeRandom(0x1a2b3c);
    return Array.from({ length: count }, () => ({
      left: rnd() * 100,
      size: 2 + rnd() * 4,
      duration: 13 + rnd() * 16,
      delay: -rnd() * 28,
      drift: (rnd() - 0.5) * 90,
      opacity: 0.25 + rnd() * 0.55,
    }));
  }, [count]);

  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}
      style={
        delay > 0
          ? ({
              opacity: 0,
              animation: `jjk-ember-in 1.4s ease-out ${delay}s forwards`,
            } as CSSProperties)
          : undefined
      }
    >
      {embers.map((e, i) => (
        <span
          key={i}
          className="jjk-ember"
          style={
            {
              left: `${e.left}%`,
              width: `${e.size}px`,
              height: `${e.size}px`,
              opacity: e.opacity,
              animationDuration: `${e.duration}s`,
              animationDelay: `${e.delay}s`,
              "--drift": `${e.drift}px`,
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}

export default CursedEnergy;
