"use client";

/**
 * InkLight — the section the wall lights for you.
 *
 * The academy block above this is lit by the pointer: you carry a candle along a
 * dark wall and read what it falls on (components/candlelit.tsx). That is the
 * right idea once. Doing it twice in a row turns a device into a mannerism, and
 * the gallery is a dozen images — hunting for them one pool at a time would be
 * work rather than atmosphere.
 *
 * So this section lights itself, and the thing that lights it is the wall. The
 * wall is a Japanese picture scroll in the dark, and as you scroll in its
 * pigment starts to glow — red strongly, green faintly, the ink lines just
 * enough to be there. What you see of the room is what the paint throws back.
 * Nothing here follows the mouse.
 *
 * Five things were tried before it: sweeping brush strokes, columns of
 * pseudo-characters, paper lanterns, a network of glowing cracks, photographed
 * boards. The first four failed the same way — they were things somebody
 * INVENTED to put on a wall, and an invented thing asks to be looked at and
 * judged, which is the one job a background must never do. The boards worked
 * but had nothing to do with the subject. The answer was to stop inventing and
 * use a real painting at an exposure where you can feel it without being able
 * to read it. See scripts/gen-wall.py.
 *
 * ── How it is possible at all ───────────────────────────────────────────────
 * `wall-glow.webp` comes out of the same run of scripts/gen-wall.py as
 * `wall.webp`, off the same scan — the pigment alone, glowing on black under a
 * very wide bloom. Screened over the base plate at the same size and offset,
 * the light lands exactly on the paint, because it IS the paint. Same one
 * derivation, two layers arrangement the hero uses for the city and its
 * streetlights, and it works for the same reason: two separately authored
 * pictures always read as two pictures.
 *
 * Only about one and a half percent of the scroll is red enough to light up,
 * which is what keeps this a background. The wide bloom is what makes those
 * few passages read as paint catching a light rather than as paint that is
 * itself luminous.
 *
 * The bloom is deliberately enormous — a couple of hundred pixels. A tight glow
 * would make the pigment look luminous in itself; a wide one makes it paint
 * catching a light, and turns each red passage into an island of lit wall with
 * darkness in between.
 *
 * ── The order of events ─────────────────────────────────────────────────────
 * The pigment ignites BEFORE the room brightens, which is why there are two
 * curves rather than one:
 *
 *     glow      0 → 0.35 of the run-in     the paint catches, in the dark
 *     veil      0.2 → 0.78                 the light spreads across the wall
 *
 * A single curve had them arrive together, and that reads as a dimmer being
 * turned up on the whole section. Letting the paint lead by a beat is what
 * makes them the cause rather than a decoration that happens to share a fade.
 *
 * Stacking order, and it matters:
 *
 *     wall           z 0     the plaster
 *     shade          z 1     the darkness that stays, with holes where the
 *                            figures reach — this is the light source
 *     veil           z 2     the run-in, black on arrival and gone after
 *     glow           z 3     screened over both, so it can burn through them
 *     content        z 4     above all of it, always
 *
 * Two constraints pulling opposite ways, and both have to hold. The glow has to
 * be ABOVE the veil, or the pigment would be dimmed by the very darkness they
 * are supposed to be burning through and the first beat — paint alight in a
 * black room — could not happen. And the whole lighting rig has to be BELOW the
 * content, because it is scenery.
 *
 * The first version got the second one wrong: it copied the arrangement from
 * candlelit.tsx, where the content deliberately sits under the veil so the
 * darkness falls over it. That is right there and wrong here. Here it put a
 * glowing wall on top of the gallery photographs.
 *
 * Under `prefers-reduced-motion` the section renders lit and static.
 */

import { useEffect, useRef, type ReactNode } from "react";
import { motion, useScroll, useTransform } from "motion/react";
import { useReducedMotion } from "@/lib/motion";

export interface InkLightProps {
  children: ReactNode;
  /**
   * How dark the room stays where no figure reaches, 0–1.
   *
   * 0.93, which is the same number `Candlelit` uses above. That is the point of
   * it: with both sections resting at the same darkness there is nothing to see
   * at the boundary between them, and the only reason this one looks brighter
   * is that it has more light sources in it than a single pointer.
   */
  darkness?: number;
  /**
   * Peak brightness of the lit pigment, 0–1.
   *
   * Low. They are the light source, not the subject — bright enough and they
   * become the thing you look at, and a background you look at is a background
   * that has stopped working.
   */
  intensity?: number;
  className?: string;
}

export function InkLight({
  children,
  darkness = 0.93,
  intensity = 0.34,
  className = "",
}: InkLightProps): ReactNode {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();

  // Same tile-grid anchoring as candlelit.tsx — both sections must sample the
  // same virtual background plane so wall.webp and wall-glow.webp are continuous
  // across the section boundary. Without this, background-position resets to
  // 0 0 at the top of each section and a hard horizontal line appears.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const update = (): void => {
      const top = el.getBoundingClientRect().top + window.scrollY;
      el.style.setProperty("--wall-y", `-${top.toFixed(0)}px`);
    };

    update();
    const ro = new ResizeObserver(update);
    ro.observe(document.documentElement);
    window.addEventListener("resize", update);

    return () => {
      ro.disconnect();
      window.removeEventListener("resize", update);
    };
  }, []);

  // "start end" is the moment the section's top edge reaches the bottom of the
  // window; "start 25%" is when that same edge has climbed to a quarter down the
  // screen. The whole ignition happens across that run-in, so it is over by the
  // time there is anything worth reading on screen.
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "start 25%"],
  });

  const glow = useTransform(scrollYProgress, [0, 0.35], [0, intensity]);
  // Straight to zero, and that is correct now: this layer is only the run-in.
  // The darkness that STAYS is `.jjk-ink-shade`, a separate static layer with a
  // mask in the shape of the figures' light — see globals.css. Before that
  // existed, this one WAS the resting state and lifting it to zero left the
  // whole wall evenly visible, which is what made the demons read as a red
  // pattern rather than as the thing lighting the room.
  const veil = useTransform(scrollYProgress, [0.2, 0.78], [1, 0]);

  if (reduced) return <div className={className}>{children}</div>;

  return (
    <div ref={ref} className={`jjk-inklit jjk-no-cursor ${className}`}>
      <div className="jjk-wall" aria-hidden="true" />
      <div className="jjk-ink-shade" aria-hidden="true" style={{ opacity: darkness }} />
      {children}
      <motion.div className="jjk-ink-veil" aria-hidden="true" style={{ opacity: veil }} />
      <motion.div className="jjk-wall-glow" aria-hidden="true" style={{ opacity: glow }} />
    </div>
  );
}

export default InkLight;
