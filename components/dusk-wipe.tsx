"use client";

/**
 * DuskWipe — the daylight frame being eaten by cursed energy.
 *
 * Two parts:
 *
 *   1. The dissolve. The dusk photo is cut into vertical strips, each holding
 *      its own slice of the image, and the strips fade out left to right with a
 *      jittered delay so the boundary tears instead of sliding. This is pure
 *      `opacity` on plain elements — no `mask-image`, no `clip-path`. The mask
 *      version this replaces animated `mask-position`, which is fragile across
 *      browsers and was not reliably revealing the night plate underneath.
 *
 *   2. The front. Not a bar: a churning cluster of blurred red blobs plus a
 *      torn texture plate, each drifting, bobbing and pulsing at its own rate
 *      inside a container that crosses the frame. The point is that no single
 *      element reads as an edge.
 *
 * Everything animates `opacity` and `transform` only.
 */

import { useMemo, type CSSProperties, type ReactNode } from "react";

/** Vertical slices the photo is cut into. More = finer tear, more DOM. */
const STRIPS = 22;

function makeRandom(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

export interface DuskWipeProps {
  src: string;
  /** Seconds the frame holds before anything happens. */
  hold?: number;
  /** Seconds the front takes to cross. */
  wipe?: number;
  onError?: () => void;
}

export function DuskWipe({
  src,
  hold = 2.4,
  wipe = 1.6,
  onError,
}: DuskWipeProps): ReactNode {
  const jitter = useMemo(() => {
    const rnd = makeRandom(0x5eed);
    return Array.from({ length: STRIPS }, () => rnd());
  }, []);

  // Blobs that make up the front. Hand-picked rather than random so the cluster
  // reads as one churning mass instead of scattered dots.
  const blobs = [
    { top: -14, size: 78, dx: 0, dur: 2.9, hue: "rgba(255,138,50,0.85)" },
    { top: 6, size: 62, dx: 22, dur: 3.7, hue: "rgba(214,26,32,0.9)" },
    { top: 30, size: 92, dx: -18, dur: 3.1, hue: "rgba(255,90,30,0.8)" },
    { top: 52, size: 58, dx: 30, dur: 4.3, hue: "rgba(150,14,22,0.95)" },
    { top: 66, size: 84, dx: -10, dur: 3.4, hue: "rgba(255,168,72,0.7)" },
    { top: 84, size: 66, dx: 16, dur: 2.6, hue: "rgba(196,20,28,0.85)" },
  ];

  const vars = {
    "--dusk-hold": `${hold}s`,
    "--wipe-dur": `${wipe}s`,
  } as CSSProperties;

  return (
    <div className="jjk-wipe" style={vars} aria-hidden="true">
      {/* --- 1 · the dissolving photo --- */}
      {Array.from({ length: STRIPS }, (_, i) => {
        const t = i / (STRIPS - 1);
        const j = jitter[i] ?? 0;
        const style = {
          // Most of the delay tracks the front; the rest is noise, and the noise
          // is what stops the boundary looking ruled.
          animationDelay: `calc(var(--dusk-hold) + var(--wipe-dur) * ${(
            t * 0.78 +
            j * 0.16
          ).toFixed(4)})`,
          animationDuration: `calc(var(--wipe-dur) * ${(0.18 + j * 0.14).toFixed(4)})`,
        } as CSSProperties;

        return (
          <div key={i} className="jjk-wipe-strip" style={style}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={src}
              alt=""
              className="jjk-wipe-slice"
              style={
                {
                  width: `${STRIPS * 100}%`,
                  left: `${i * -100}%`,
                } as CSSProperties
              }
              {...(i === 0 && onError ? { onError } : {})}
            />
          </div>
        );
      })}

      {/* --- 2 · the front --- */}
      <div className="jjk-front">
        <div className="jjk-front-tex" />
        {blobs.map((b, i) => (
          <span
            key={i}
            className="jjk-front-blob"
            style={
              {
                top: `${b.top}%`,
                width: `${b.size}%`,
                height: `${b.size}%`,
                background: `radial-gradient(circle, ${b.hue} 0%, transparent 68%)`,
                animationDuration: `${b.dur}s`,
                animationDelay: `${-i * 0.7}s`,
                "--dx": `${b.dx}%`,
              } as CSSProperties
            }
          />
        ))}
      </div>
    </div>
  );
}

export default DuskWipe;
