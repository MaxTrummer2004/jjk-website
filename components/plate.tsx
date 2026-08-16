/**
 * Plate — one panel cut from the Sanjō scroll, hung behind a section.
 *
 * ── What it is, and what it is not ──────────────────────────────────────────
 * It is the second of exactly two painted surfaces on this site. The first is
 * `Room` (components/room.tsx): the night-parade emaki as a seamless tile, a
 * wall that runs the length of the page. This one is a PANEL — one stretch of
 * one scroll, shown once, cropped like something hung on that wall.
 *
 * The distinction is not decoration. A tile has to be seamless in both
 * directions and is therefore the same few square metres of paper repeated,
 * which is why it can be a texture and can never be a picture. A panel is under
 * no such obligation, so it can be the ox-carts, or the palace interior, or the
 * fire. That is the whole reason the lower half of the page alternates between
 * the two: six more sections of the same tile is a surface nobody sees any
 * more, and six panels in a row is a gallery rather than a building.
 *
 * ── Why it is not a third lighting rig ──────────────────────────────────────
 * Because this project has learned that lesson three times. `.jjk-wall` and
 * `.jjk-scroll-plate` are both a cold plate stored WALL_GAIN too bright, a
 * veil, and the picture's own light screened back on top; so is this, at the
 * same two numbers — `brightness(0.4)` is 1/2.5 and `0.42` is GLOW_INTENSITY
 * out of lit-wall.tsx. The plates themselves come out of the same grading
 * function as both of the others (scripts/gen-section-plates.py), constant for
 * constant. Two surfaces authored separately read as two surfaces however
 * carefully somebody tunes them towards each other; these are not authored
 * separately.
 *
 * ── Eager, at low priority — and why not lazy ───────────────────────────
 * These carried the browser's own lazy loading first, which is the obvious
 * answer: eight files, about 730 KB, none of it on screen when the page opens.
 *
 * It was wrong here, and the failure mode is the reason. That loading is a
 * BROWSER HEURISTIC — it depends on the tab being painted, on the intersection
 * machinery running, and on the load having settled. Caught in testing: in a
 * tab that was not being painted, the panels were scrolled fully into view and
 * still never fetched, so four sections of the page had no ground at all. A
 * background that sometimes fails to arrive is worse than one that always costs
 * 730 KB, because the whole design of the lower half rests on its being there.
 *
 * So: eager, at low fetch priority. Deterministic — the browser will fetch them,
 * and it will fetch everything above the fold first. `<img>` rather than a CSS
 * `background-image` for the same reason: a background has no priority hint at
 * all.
 *
 * The optimizer is deliberately bypassed for the same reason it is bypassed in
 * the opening: these plates are already sized, graded and compressed for
 * exactly this use, and re-encoding a near-black image is where a codec does
 * its worst.
 */

import type { CSSProperties, ReactNode } from "react";

/** The four windows out of scripts/gen-section-plates.py. */
export type PlateName = "carts" | "court" | "blaze" | "sutra";

export interface PlateProps {
  name: PlateName;
  children: ReactNode;
  /**
   * Where the crop sits when the section is taller than the panel is deep.
   * Any `object-position`. The panels are between 1.85:1 and 2.44:1 and the
   * sections standing on them are usually taller than that, so this decides
   * which part of the picture survives — it is the framing, not a nicety.
   */
  focus?: string;
  /** How dark the veil is. 0.86 unless there is a reason. */
  dark?: number;
  /** Screened light, 0.42 unless there is a reason. */
  glow?: number;
  className?: string;
}

export function Plate({
  name,
  children,
  focus = "center",
  dark,
  glow,
  className = "",
}: PlateProps): ReactNode {
  const vars: CSSProperties = {
    ...(dark === undefined ? {} : ({ "--plate-dark": dark } as CSSProperties)),
    ...(glow === undefined ? {} : ({ "--plate-glow": glow } as CSSProperties)),
  };
  const fit: CSSProperties = { objectPosition: focus };

  return (
    <div className={`jjk-plate ${className}`} style={vars}>
      {/* ── Der Raum ────────────────────────────────────────────────────────
          Klebend und bildschirmhoch, mit negativem Aussenabstand, damit er im
          Fluss keinen Platz belegt. Das Bild steht also STILL, waehrend der
          Inhalt darueber laeuft.

          Vorher lief die Tafel mit. Dabei wandert ihre Oberkante als Linie
          durch das Bild, und weil oberhalb die Wand steht und unterhalb die
          Rolle, wechselt an dieser wandernden Linie die ganze Flaeche — "sieht
          aus, als waere da einfach ein neues Bild abgehakt". Genau so ist es
          auch gewesen.

          Ein stehendes Bild kann diese Linie nicht haben. Was den Wechsel
          jetzt macht, sind die beiden Baender unten. */}
      <div className="jjk-plate-room" aria-hidden="true">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          className="jjk-plate-cold"
          src={`/img/plate-${name}-cold.webp`}
          alt=""
          loading="eager"
          fetchPriority="low"
          decoding="async"
          draggable={false}
          style={fit}
        />
        <div className="jjk-plate-veil" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          className="jjk-plate-glow"
          src={`/img/plate-${name}-glow.webp`}
          alt=""
          loading="eager"
          fetchPriority="low"
          decoding="async"
          draggable={false}
          style={fit}
        />
      </div>

      <div className="jjk-plate-body">{children}</div>
    </div>
  );
}

export default Plate;
