"use client";

/**
 * KanjiTitle — 柔術廻戦 drawn by cursed energy.
 *
 * Each glyph is rendered three times from the same baked outline:
 *   1. `bloom`  a fat, blurred red stroke — the energy gathering around the form
 *   2. `trace`  a thin hot edge that runs along the contour (dashoffset 1 → 0)
 *   3. `fill`   the finished glyph, black with the cream outline, faded in
 *               behind the trace once it has swept past
 *
 * The dash animation uses `pathLength={1}`, which normalises every contour to a
 * length of 1 regardless of its real perimeter. That means no measuring in the
 * DOM and all four glyphs draw at a matched pace even though 戦 has half again
 * as much outline as 柔.
 *
 * What this is NOT: stroke-order writing. Fonts store filled outlines, not
 * centrelines, so the hot edge traces the silhouette. That is also how the logo
 * resolves in the opening, so it reads correctly.
 *
 * Each glyph sits in its OWN svg inside a flex row rather than all four sharing
 * one canvas. That costs a little markup and buys per-glyph control.
 *
 * ── Going out ───────────────────────────────────────────────────────────────
 * `burning` closes the loop with the intro: the same hot edge that drew each
 * glyph runs back around it, the fill goes from black through dull red, through
 * properly alight, to ash lifting off the top of the frame, and sparks come off
 * the top. Seven stages rather than four, because the whole exit is now built
 * around watching this happen rather than around getting past it.
 *
 * It is a CSS animation on its own clock, triggered once by scroll, rather than
 * scrubbed by scroll position. Deliberately: a scrubbed burn un-burns when you
 * nudge the wheel upward, which looks like a bug. And the per-glyph stagger is
 * one custom property instead of four sets of motion values.
 *
 * This replaced two scroll-transform exits — a scale-up and a scatter. Both
 * looked cheap for the same reason: moving a flat vector in 2D gives the eye no
 * depth cue, so it reads as an image being pushed around. Burning is not a
 * transformation of the shape, so it never invites that reading.
 */

import { motion, type MotionStyle } from "motion/react";
import type { CSSProperties, ReactNode } from "react";
import { KANJI_TITLE, KANJI_Y_MAX, KANJI_Y_MIN } from "@/lib/kanji-paths";

/** Room around each glyph so the bloom and stroke are not clipped. */
const PAD = 90;

export interface KanjiTitleProps {
  className?: string;
  style?: CSSProperties;
  /** Seconds before the first glyph starts drawing. */
  delay?: number;
  /** Seconds between glyph starts. */
  stagger?: number;
  /**
   * Per-glyph motion styles, in reading order. Anything motion accepts works —
   * x, y, rotate, opacity, filter.
   */
  glyphMotion?: (MotionStyle | undefined)[];
  /** Start the burn. One-way: there is no un-burning. */
  burning?: boolean;
  /** Seconds between glyphs catching. */
  burnStagger?: number;
}

export function KanjiTitle({
  className = "",
  style,
  delay = 0.35,
  stagger = 0.42,
  glyphMotion,
  burning = false,
  burnStagger = 0.24,
}: KanjiTitleProps): ReactNode {
  const vbHeight = KANJI_Y_MAX - KANJI_Y_MIN + PAD * 2;

  // Fixed offsets rather than random ones: sparks that jump to new positions on
  // a re-render would give the whole thing away.
  const sparkOffsets = [-26, 12, -8, 30, -18, 6, 22, -34];

  return (
    <div
      className={`flex w-full items-center justify-center ${className}`}
      {...(style ? { style } : {})}
    >
      {KANJI_TITLE.map((glyph, i) => {
        const vbWidth = glyph.advance + PAD * 2;
        const vars = { "--delay": `${delay + i * stagger}s` } as CSSProperties;
        const motionStyle = glyphMotion?.[i];

        return (
          <motion.div
            key={glyph.char}
            className="relative min-w-0 flex-1"
            {...(motionStyle ? { style: motionStyle } : {})}
          >
            {burning &&
              sparkOffsets.map((sx, k) => (
                <span
                  key={k}
                  className="jjk-kanji-spark"
                  style={
                    {
                      left: `${12 + k * 10}%`,
                      "--sx": `${sx}px`,
                      "--spark-delay": `${i * burnStagger + k * 0.07}s`,
                    } as CSSProperties
                  }
                />
              ))}

            <svg
              className="jjk-kanji-svg w-full"
              data-burn={burning ? "on" : undefined}
              viewBox={`0 0 ${vbWidth} ${vbHeight}`}
              role="img"
              aria-label={glyph.char}
              style={{ ...vars, "--burn-delay": `${i * burnStagger}s` } as CSSProperties}
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                <filter
                  id={`jjk-cursed-bloom-${i}`}
                  x="-30%"
                  y="-30%"
                  width="160%"
                  height="160%"
                >
                  <feGaussianBlur stdDeviation="14" />
                </filter>
              </defs>

              {/* Font units are Y-up; flip, then inset by the padding. */}
              <g transform={`translate(${PAD} ${KANJI_Y_MAX + PAD}) scale(1 -1)`}>
                <path
                  className="jjk-kanji-bloom"
                  d={glyph.d}
                  pathLength={1}
                  filter={`url(#jjk-cursed-bloom-${i})`}
                />
                <path className="jjk-kanji-fill" d={glyph.d} />
                <path className="jjk-kanji-trace" d={glyph.d} pathLength={1} />
              </g>
            </svg>
          </motion.div>
        );
      })}
    </div>
  );
}

export default KanjiTitle;
