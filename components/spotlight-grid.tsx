"use client";

/**
 * SpotlightGrid — a light you carry across a grid.
 *
 * ── What it is ──────────────────────────────────────────────────────────────
 * The react-bits idiom: a pointer-tracked radial light over a grid of cards,
 * so the thing under the pointer is the thing that is lit. Two custom
 * properties, one listener, no per-card state, no observer.
 *
 * ── Why it belongs on THIS page specifically ────────────────────────────────
 * Because the page already had this idea and then gave it up. The upper half is
 * a dark room you read by torchlight; `Room` takes the torch away at the
 * programme boards on the grounds that a pointer-held pool is hopeless for a
 * six-column timetable, which is true — you cannot search a table through a
 * keyhole.
 *
 * This is the other half of that argument. The light does not decide what is
 * READABLE here; the cards are lit on their own and can be read anywhere. It
 * sits BEHIND them, so what it actually lights is the one-pixel grid between
 * them — the lines catch as the pointer passes, and the day you are looking at
 * is framed in ember without a single character changing contrast.
 *
 * ── Why it is behind and not on top ─────────────────────────────────────────
 * Tried on top first, screened. Screen can only add light, so it cannot make
 * anything unreadable — but it lifts the near-black background of a card far
 * more than it lifts the near-white type on it, and the contrast collapses
 * exactly where you are looking. Behind the cards, the same glow reaches the
 * reader only through the gaps and through the cards' own translucency, which
 * is the effect wanted and costs nothing at all.
 *
 * ── The frame budget ────────────────────────────────────────────────────────
 * `pointermove` writes to a ref; one rAF per frame writes the two properties.
 * The properties are consumed by a background-position, so nothing is
 * re-rastered — this is the cheapest pointer effect on the page by a distance,
 * and unlike the wall's it is not tracking a pool across eight thousand pixels.
 */

import {
  useCallback,
  useEffect,
  useRef,
  type CSSProperties,
  type ReactNode,
} from "react";
import { useReducedMotion } from "@/lib/motion";

export interface SpotlightGridProps {
  children: ReactNode;
  /** Radius of the pool, in px. */
  radius?: number;
  /** Peak strength of the light, 0–1. */
  intensity?: number;
  className?: string;
}

export function SpotlightGrid({
  children,
  radius = 260,
  intensity = 1,
  className = "",
}: SpotlightGridProps): ReactNode {
  const ref = useRef<HTMLDivElement>(null);
  const target = useRef({ x: 0, y: 0, on: 0 });
  const frame = useRef<number | null>(null);
  const reduced = useReducedMotion();

  const flush = useCallback((): void => {
    frame.current = null;
    const el = ref.current;
    if (!el) return;
    const t = target.current;
    el.style.setProperty("--sx", `${t.x.toFixed(0)}px`);
    el.style.setProperty("--sy", `${t.y.toFixed(0)}px`);
    el.style.setProperty("--son", `${t.on}`);
  }, []);

  const schedule = useCallback((): void => {
    if (frame.current === null) frame.current = requestAnimationFrame(flush);
  }, [flush]);

  useEffect(() => {
    const el = ref.current;
    if (!el || reduced) return;
    // Touch and pen have no hover, so there is no pool to follow them with and
    // the grid is simply the grid. Same test the wall uses.
    if (!window.matchMedia("(pointer: fine)").matches) return;

    const onMove = (e: PointerEvent): void => {
      const rect = el.getBoundingClientRect();
      target.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
        on: 1,
      };
      schedule();
    };
    const onLeave = (): void => {
      target.current.on = 0;
      schedule();
    };

    el.addEventListener("pointermove", onMove, { passive: true });
    el.addEventListener("pointerleave", onLeave, { passive: true });
    return () => {
      if (frame.current !== null) cancelAnimationFrame(frame.current);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerleave", onLeave);
    };
  }, [reduced, schedule]);

  return (
    <div
      ref={ref}
      className={`jjk-spot ${className}`}
      style={
        {
          "--spot-r": `${radius}px`,
          "--spot-i": intensity,
        } as CSSProperties
      }
    >
      <div className="jjk-spot-pool" aria-hidden="true" />
      {children}
    </div>
  );
}

export default SpotlightGrid;
