/**
 * The numbers that describe the camera flying into Graz.
 *
 * They live here because two components have to agree on them exactly.
 * components/hero.tsx transforms the city plate; components/zoom-streaks.tsx
 * runs three copies of the glow plate ahead of it as motion blur. If the two
 * drift apart the streaks stop being the same picture in motion and become
 * loose glowing shapes sitting on top of the frame — a failure that already
 * happened once with `BASE_SCALE`, which was duplicated in both files with a
 * comment in each begging the next person to keep them in step.
 *
 * ── Why there is a tilt at all ──────────────────────────────────────────────
 * The backdrop is a map: a flat plane seen from directly above. The frame it is
 * modelled on is not — you are looking at the city at an angle, and that angle
 * is most of why it reads as a place you are falling toward rather than a
 * diagram you are being shown.
 *
 * Doing it in CSS rather than baking it into the image is the whole point. As a
 * transform it is one number, reversible, and it can CHANGE during the exit,
 * which is what actually sells the dive: the plane leans further away as you
 * approach it, the way ground does when you drop toward it. Rendered into the
 * picture it would be a fixed distortion sitting there before anything moves.
 *
 * ── The resting values are not zero ─────────────────────────────────────────
 * REST_TILT means the very first frame is already at an angle. The cost is that
 * a rotated plane no longer fills its own box: perspective pulls the far edge
 * in, and at 7 degrees with this perspective distance the top of the frame
 * narrows by a bit over two percent. REST_SCALE covers that, which is the only
 * reason it is not 1.
 *
 * Keep them paired. Raising the tilt without raising the scale opens black
 * wedges in the top corners.
 */

/** Perspective distance in px. Shorter is a wider lens and a more violent tilt. */
export const PERSPECTIVE = 1400;

/** Scale and tilt before the click. */
export const REST_SCALE = 1.12;
export const REST_TILT = 7;

/** Scale and tilt at the end of the fly-through. */
export const EXIT_SCALE = 3.4;
export const EXIT_TILT = 15;

/**
 * Fraction of the exit at which both reach their end values.
 *
 * The frame is at 97% black by 0.22 (`veil` in components/hero.tsx), so most of
 * this ramp happens behind a curtain and only its first half is ever seen. That
 * is deliberate — the movement has to still be accelerating when it disappears,
 * or the exit reads as slowing down into nothing.
 */
export const RAMP_AT = 0.4;
