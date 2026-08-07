"use client";

/**
 * FlyIn — the opening camera move, Europe down to a Graz street.
 *
 * ── Why it exists ───────────────────────────────────────────────────────────
 * The backdrop is a light map of Graz. It reads unmistakably as a city and not
 * at all as an Austrian one, and captioning a picture is an admission that the
 * picture failed. So the opening arrives from far enough out that the country
 * is the thing you recognise, and the street map is simply where the move ends.
 *
 * ── How a zoom is made out of four pictures ─────────────────────────────────
 * Every plate is centred on the same point and rendered at a known width in
 * kilometres (scripts/gen-graz-zoom.py). If the camera is at `km` kilometres
 * across, a plate covering `plateKm` shows at a scale of plateKm / km — so at
 * any moment each plate has exactly one correct size, and there is no
 * choreography to write.
 *
 * All four are on screen the whole time, and each one's OPACITY is the only
 * thing being decided: full while the camera is near its own scale, fading out
 * as the camera leaves. Because every plate keeps scaling while it fades, the
 * handover happens between two images that are both already moving at the same
 * rate, in the same direction, showing the same place. There is no frame at
 * which anything stops or jumps.
 *
 * That is the Deep Zoom arrangement — arbitrarily deep motion out of a handful
 * of images. Nothing here is novel; the only decision is the fade width.
 *
 * ── The path ────────────────────────────────────────────────────────────────
 * Exponential, not linear. Halving the width takes the same time whether you
 * are going from a thousand kilometres to five hundred or from twenty to ten,
 * which is what makes the approach feel like constant speed rather than a
 * violent arrival — it is the same reason `flyTo` in every mapping library is
 * built on a logarithmic curve. A linear ramp between these numbers spends
 * nine tenths of the run over open country and then slams into the city.
 *
 * ── What it hands over to ───────────────────────────────────────────────────
 * Nothing. The last plate in the ladder is `graz-night.webp`, which is the hero
 * backdrop composited, so the move ends on the picture that was going to be
 * there anyway. The layer then fades out over the real backdrop underneath —
 * two identical images crossfading, which is invisible by construction — and
 * the night-flicker opening proceeds from there untouched.
 *
 * Under `prefers-reduced-motion` it renders the final frame and never moves.
 */

import { useEffect, useRef, type ReactNode } from "react";
import { useReducedMotion } from "@/lib/motion";

/**
 * Plate widths in kilometres, wide to narrow. Must match LEVELS + FINAL_KM in
 * scripts/gen-graz-zoom.py — they are one ladder written down twice, and the
 * script prints them into public/img/zoom-levels.json so a mismatch is at least
 * findable.
 */
const PLATES = [
  { src: "/img/zoom-0.webp", km: 1100 },
  { src: "/img/zoom-1.webp", km: 230 },
  { src: "/img/zoom-2.webp", km: 45 },
  { src: "/img/graz-night.webp", km: 9 },
] as const;

// Derived rather than indexed. `noUncheckedIndexedAccess` is on in this repo,
// so PLATES[0] is possibly-undefined as far as the compiler is concerned — and
// widest/narrowest is what these actually mean anyway, so the order of the list
// stops being load-bearing.
const START_KM = Math.max(...PLATES.map((p) => p.km));
const END_KM = Math.min(...PLATES.map((p) => p.km));

/**
 * Seconds spent standing still at each plate's own scale, and seconds spent
 * travelling between two of them.
 *
 * The first version had neither — one continuous exponential ramp from Europe
 * to a street in two and a half seconds. It was unreadable: at that rate each
 * level is on screen for about half a second while still growing, which is not
 * long enough to recognise a continent, let alone a country.
 *
 * Pausing is what makes it legible, and it also makes it read as a camera
 * rather than as an animation — something arrives somewhere, looks, and moves
 * on. Each move eases in AND out, so a stop is a stop rather than a stall.
 */
const DWELL = 1.05;
/** Seconds per halving of the camera's width, i.e. per octave travelled. */
const TRAVEL = 0.72;

const _OCTAVES = Math.abs(Math.log2(START_KM) - Math.log2(END_KM));

/** Total seconds of the move. Imported by the hero so the opening stays in step. */
export const FLY_SECONDS =
  DWELL * (PLATES.length - 1) + TRAVEL * _OCTAVES;

/**
 * How wide the crossfade is, in octaves of camera width.
 *
 * One and a quarter halvings either side of a plate's own scale. Wide enough
 * that two plates overlap for a good fraction of a second at this speed, narrow
 * enough that three are never fighting. Below about 0.8 the swap becomes a
 * visible dissolve; above 2 the far plates are still faintly present when they
 * are ten times too soft.
 */
const FADE_OCTAVES = 1.25;

export interface FlyInProps {
  /** Seconds the move takes. Defaults to the ladder's own total. */
  duration?: number;
  /** Seconds the finished frame is held before the layer lets go. */
  hold?: number;
  className?: string;
}

export function FlyIn({
  duration = FLY_SECONDS,
  hold = 0.45,
  className = "",
}: FlyInProps): ReactNode {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    const root = ref.current;
    if (!root || reduced) return;

    const layers = Array.from(
      root.querySelectorAll<HTMLElement>("[data-km]")
    ).map((el) => ({ el, km: Number(el.dataset.km) }));

    // The path, in octaves. Everything happens in log space: the fade width is
    // measured there, the travel is linear there, and a halving therefore costs
    // the same wherever it happens — which is the whole reason a zoom feels like
    // constant speed instead of a violent arrival.
    const stops = PLATES.map((p) => Math.log2(p.km));

    // Dwell, travel, dwell, travel… ending on the last plate. Built as a list so
    // adding a level to the ladder needs no other change.
    const segments: { from: number; to: number; dur: number }[] = [];
    stops.forEach((oct, i) => {
      if (i > 0) {
        // Travel time in proportion to the DISTANCE, in octaves. The steps in
        // the ladder are not evenly spaced — Europe to Austria is under two
        // halvings, Styria to a street is nearly four — and a fixed time per
        // step would fly the short hop at half the speed of the long one. In
        // log space, equal time per octave is what constant speed means.
        const span = Math.abs((stops[i - 1] ?? oct) - oct);
        segments.push({ from: stops[i - 1] ?? oct, to: oct, dur: TRAVEL * span });
        segments.push({ from: oct, to: oct, dur: DWELL });
      }
    });
    const total = segments.reduce((a2, sg) => a2 + sg.dur, 0);
    const scaleTime = duration / (total || 1);

    // Ease in AND out of every move. A pause bracketed by two linear moves does
    // not read as a pause — the camera appears to stop dead and set off again.
    const smooth = (x: number): number => x * x * (3 - 2 * x);

    const octAt = (elapsed: number): number => {
      let left = elapsed / scaleTime;
      for (const sg of segments) {
        if (left <= sg.dur) {
          return sg.from + (sg.to - sg.from) * smooth(sg.dur ? left / sg.dur : 1);
        }
        left -= sg.dur;
      }
      return stops[stops.length - 1] ?? 0;
    };

    let raf = 0;
    let t0 = 0;

    const frame = (now: number): void => {
      if (!t0) t0 = now;
      const elapsed = (now - t0) / 1000;
      const t = Math.min(1, elapsed / duration);
      const oct = octAt(elapsed);
      const km = Math.pow(2, oct);

      for (const { el, km: plateKm } of layers) {
        el.style.transform = `scale(${(plateKm / km).toFixed(4)})`;
        const d = Math.abs(Math.log2(plateKm) - oct) / FADE_OCTAVES;
        // The narrowest plate never fades out: it is the destination, and it is
        // the same image as the backdrop waiting underneath.
        const near = 1 - Math.min(1, d);
        el.style.opacity =
          plateKm === END_KM ? Math.max(near, t >= 1 ? 1 : 0).toFixed(3) : near.toFixed(3);
      }

      if (t < 1) {
        raf = requestAnimationFrame(frame);
        return;
      }
      // Let go. The frame underneath is the same picture at the same size, so
      // this fade has nothing to reveal — it only takes the extra layer, and its
      // decoding cost, back out of the page.
      root.style.transition = `opacity 0.5s linear ${hold}s`;
      root.style.opacity = "0";
      window.setTimeout(() => {
        root.style.display = "none";
      }, (hold + 0.6) * 1000);
    };

    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [reduced, duration, hold]);

  if (reduced) return null;

  return (
    <div
      ref={ref}
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}
    >
      {PLATES.map((p) => (
        // eslint-disable-next-line @next/next/no-img-element -- next/image wants
        // to own layout and lazy-loading, and both are wrong here: these four
        // are transformed every frame and must all be decoded before the move
        // starts, or a plate pops in during its own crossfade.
        <img
          key={p.src}
          src={p.src}
          alt=""
          data-km={p.km}
          // `eager` on all four: they are the first thing on screen and a plate
          // that arrives late would pop in halfway through its own fade.
          loading="eager"
          decoding="sync"
          className="absolute inset-0 h-full w-full object-cover will-change-transform"
          // The widest plate is visible in the SERVER-rendered markup, the rest
          // are not. Measured in the built app, hydration takes long enough that
          // starting all four at zero left the first moment of the page black —
          // and that moment is the one everybody sees. This way the continent is
          // simply there, and the move begins under it.
          style={{
            opacity: p.km === START_KM ? 1 : 0,
            transformOrigin: "50% 50%",
          }}
        />
      ))}
    </div>
  );
}

export default FlyIn;
