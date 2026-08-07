"use client";

/**
 * ZoomStreaks — the fly-through, made to look deliberate.
 *
 * ── Why it exists ───────────────────────────────────────────────────────────
 * Originally as damage control. The backdrop was a 2364 px photograph, the exit
 * pushes `scale` to 3.4, and by the end the browser was inventing roughly three
 * pixels for every real one — so these streaks were here to make the softness
 * read as SPEED rather than as a bad image.
 *
 * That problem is gone. The backdrop is now rendered from OpenStreetMap data at
 * whatever resolution is asked for (scripts/gen-graz-map.py), so there is no
 * upscaling left to hide. The streaks stayed anyway, because the reason they
 * worked was never the blur: flying at something fast genuinely does smear it
 * outward from the centre of travel, and the frame looked wrong without it.
 *
 * ── How ─────────────────────────────────────────────────────────────────────
 * Three copies of the glow plate run AHEAD of the main image — same picture,
 * larger scale, same camera angle, low opacity — and the eye integrates them
 * into streaks.
 *
 * Only the glow plate, and only the glow plate. In real zoom blur it is the
 * bright things that smear visibly while the dark ones stay put, so streaking
 * the whole frame would look like a smudge rather than like motion. And a
 * parallax plane made of the twinkle plate, which was here and is documented
 * below, failed for the mirror-image reason: DIFFUSE light smears, POINT light
 * multiplies.
 *
 * ── Why it costs nothing to download ────────────────────────────────────────
 * Every source here is already on screen: `CityBackdrop` loads the same glow and
 * twinkle plates for the opening flicker, so these are cache hits. That is also
 * why the layers stay mounted at zero opacity rather than being conditionally
 * rendered — a fresh decode in the middle of the animation would show up as a
 * hitch at the worst possible moment.
 *
 * All four layers are `screen`, so they only ever add light. Over the near-black
 * city that means they are invisible where the city is dark and only build where
 * it is already lit, which is the correct behaviour and needs no masking.
 */

import { motion, useTransform, type MotionValue } from "motion/react";
import type { ReactNode } from "react";
import {
  EXIT_SCALE,
  EXIT_TILT,
  PERSPECTIVE,
  RAMP_AT,
  REST_SCALE,
  REST_TILT,
} from "@/lib/flythrough";

const GLOW = "/img/graz-glow.webp";

interface StreakProps {
  /** The hero's exit clock, 0 → 1. */
  progress: MotionValue<number>;
  src: string;
  /** How far ahead of the main image this copy runs. 1 = in step. */
  factor: number;
  /** Peak opacity. */
  peak: number;
  /** Fraction of the exit at which it reaches that peak. */
  fadeIn: number;
}

function Streak({ progress, src, factor, peak, fadeIn }: StreakProps): ReactNode {
  const scale = useTransform(
    progress,
    [0, RAMP_AT],
    [REST_SCALE, EXIT_SCALE * factor]
  );

  // The tilt is NOT multiplied by `factor`, and that is the point of it being
  // separate from the scale.
  //
  // `factor` says how far ahead in the ZOOM a copy runs — it is the same plane
  // a moment later, which is what makes the three of them integrate into a
  // streak pointing away from the centre. The tilt is not a property of the
  // plane, it is where the camera is, and there is one camera. Scaling it per
  // copy would fan the echoes out at different angles and turn a smear into
  // three separate pictures at three separate attitudes.
  const rotateX = useTransform(progress, [0, RAMP_AT], [REST_TILT, EXIT_TILT]);

  // A flash, not a fixture. The frame is at 97% black by 0.22 of the exit
  // (`veil` in components/hero.tsx) and these are done by then — streaks of
  // light hanging over a black screen have nothing left to be the motion blur
  // OF, and read as loose glowing shapes.
  //
  // Every stop is a fraction of a 4.7s exit, so 0.02 is just under a tenth of a
  // second. `fadeIn` must stay below the 0.12 stop: the array is an input range
  // and useTransform needs it strictly increasing.
  const opacity = useTransform(
    progress,
    [0, fadeIn, 0.12, 0.22],
    [0, peak, peak * 0.7, 0]
  );

  return (
    <motion.img
      src={src}
      alt=""
      aria-hidden="true"
      className="absolute inset-0 h-full w-full object-cover mix-blend-screen"
      style={{ transformPerspective: PERSPECTIVE, scale, rotateX, opacity }}
    />
  );
}

export interface ZoomStreaksProps {
  progress: MotionValue<number>;
  className?: string;
}

export function ZoomStreaks({ progress, className = "" }: ZoomStreaksProps): ReactNode {
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}
    >
      {/* Ordered near to far. The nearest echo is the brightest because it is
          the least displaced — the further ahead a copy runs, the more it is
          spreading the same light over a larger area. */}
      <Streak progress={progress} src={GLOW} factor={1.16} peak={0.45} fadeIn={0.02} />
      <Streak progress={progress} src={GLOW} factor={1.4} peak={0.28} fadeIn={0.035} />
      <Streak progress={progress} src={GLOW} factor={1.72} peak={0.16} fadeIn={0.05} />

      {/* There was a fourth layer here: the twinkle plate at 2.4x as a parallax
          plane, so the lights pulled away from the streets underneath them. The
          depth cue was real; the side effect was worse. That plate is isolated
          bright cores on transparency, so scaling it past 2x scattered small
          yellow-white dots across the whole screen the instant you clicked.
          Diffuse light smears into streaks. Point light just multiplies into
          confetti. The three glow copies above are pictures of a city, and they
          behave. */}
    </div>
  );
}

export default ZoomStreaks;
