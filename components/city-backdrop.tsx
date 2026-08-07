"use client";

/**
 * CityBackdrop — Graz from above at night, graded to the neon red of the
 * opening's Tokyo shot, and quietly alive.
 *
 * Source order, first one that loads wins:
 *   1. /img/graz-unlit.webp  — the plate that ships with the repo
 *   2. /img/graz-aerial.jpg  — the procedural stand-in
 *
 * Four layers:
 *   a. the unlit city (graz-unlit.webp)
 *   b/c. the glow (graz-glow.webp) and two twinkle plates holding the hot cores,
 *        screened on top and cross-faded on different periods so districts blink
 *        against each other instead of the whole frame pulsing as one
 *   d. drifting warm patches, as if traffic and lit blocks breathed
 *
 * b and c live INSIDE the drift container on purpose: they have to travel with
 * the still, or the sparkle would slide off the buildings it belongs to.
 */

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";

const SOURCES = ["/img/graz-unlit.webp", "/img/graz-aerial.jpg"] as const;
const TWINKLE = ["/img/graz-lights-1.webp", "/img/graz-lights-2.webp"] as const;
/**
 * The lit half of the frame. Screened over the unlit plate this rebuilds the
 * night image exactly; at zero opacity the city is simply dark.
 *
 * This replaced the opening-plate approach. There used to be a separate picture
 * for the intro — a manga panel, a dusk photo, a cold structural map — and the
 * hero cut between it and the night frame. Two pictures, however carefully
 * matched, read as two pictures. Splitting ONE derivation into "the city" and
 * "its lights" makes the flicker the streetlights striking instead: the
 * hillside, the river and the block structure never move, because they sit on a
 * layer nothing is happening to.
 */
const GLOW = "/img/graz-glow.webp";

export interface CityBackdropProps {
  /** Override the source chain — first entry is tried first. */
  sources?: readonly string[];
  /**
   * Set when the source is an untouched photo (a daylight aerial, a snapshot).
   * Turns on the duotone + bloom blend layers that convert it to the ember
   * palette. The shipped assets are already graded, so this stays off: running
   * the duotone over a graded image washes it out to pink.
   */
  raw?: boolean;
  /** Blinking lights and breathing districts. Off for a static backdrop. */
  animated?: boolean;
  /** Hold the city dark, then strike the lights on. Runs on every page load. */
  intro?: boolean;
  /** Seconds the city stays dark before the first flicker. */
  hold?: number;
  /** Seconds the flicker takes before the lights stay on. */
  wipe?: number;
  /**
   * Seconds before the slow push-in starts.
   *
   * The hero sets this to the moment the fly-in lands. The move ends on this
   * backdrop's own picture at its own size, so anything that has already moved
   * it by then turns the hand-over into a visible jump to a differently framed
   * map. See `jjk-aerial-drift` in globals.css.
   */
  driftDelay?: number;
  /**
   * Seconds before the plates are put in the DOM at all.
   *
   * Four plates at 4000×2250 is thirty-six megapixels to decode, and while the
   * fly-in is running not one pixel of it is visible — the move is showing the
   * same city out of its own copy. Loading them on the first paint was a large
   * part of why the opening stalled. The hero sets this to a couple of seconds
   * before the landing, which lands the fetch and the decode inside a dwell,
   * where the camera is standing still and a dropped frame costs nothing.
   */
  loadDelay?: number;
  /** Override the glow layer. */
  glowSrc?: string;
  className?: string;
}

export function CityBackdrop({
  sources = SOURCES,
  raw = false,
  animated = true,
  intro = true,
  hold = 2.4,
  wipe = 1.4,
  driftDelay = 0,
  loadDelay = 0,
  glowSrc = GLOW,
  className = "",
}: CityBackdropProps): ReactNode {
  const [index, setIndex] = useState(0);
  const [twinkleOk, setTwinkleOk] = useState(true);
  const [glowOk, setGlowOk] = useState(true);
  const imgRef = useRef<HTMLImageElement>(null);
  const src = sources[Math.min(index, sources.length - 1)];
  const exhausted = index >= sources.length;

  const advance = useCallback(() => setIndex((i) => i + 1), []);

  const [loadable, setLoadable] = useState(loadDelay <= 0);
  useEffect(() => {
    if (loadable) return;
    const t = window.setTimeout(() => setLoadable(true), loadDelay * 1000);
    return () => window.clearTimeout(t);
  }, [loadable, loadDelay]);

  // The markup is server-rendered, so a 404 on the first source can fire before
  // React attaches onError. Re-check once on mount: a finished image with zero
  // intrinsic width is a failed image.
  useEffect(() => {
    const img = imgRef.current;
    if (img?.complete && img.naturalWidth === 0) advance();
  }, [advance, index]);

  // The twinkle plates only match the shipped still. If the chain fell through
  // to a different source they would be registered to the wrong geometry.
  const showTwinkle = animated && twinkleOk && index === 0;
  // Without the glow there is nothing to switch on, so the flicker would be a
  // dark frame blinking at a dark frame — skip it and just show the city.
  const showIntro = intro && glowOk && index === 0;

  return (
    <div
      className={`jjk-neon-grade-wrap absolute inset-0 overflow-hidden ${
        raw ? "is-raw" : ""
      } ${className}`}
    >
      {loadable && !exhausted && src && (
        <div
          className="jjk-aerial-drift absolute inset-0"
          style={{ "--jjk-drift-delay": `${driftDelay}s` } as CSSProperties}
        >
          {/* The city with its lights out. Always visible, never touched by the
              flicker — this is the layer that keeps the frame steady. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            ref={imgRef}
            key={src}
            src={src}
            alt=""
            aria-hidden="true"
            className="jjk-neon-grade h-full w-full object-cover"
            onError={advance}
          />

          {/* Everything that glows. The only thing the flicker touches. */}
          <div
            className="jjk-night-group"
            data-break={showIntro ? "play" : undefined}
            style={
              showIntro
                ? ({
                    "--break-hold": `${hold}s`,
                    "--break-dur": `${wipe}s`,
                  } as CSSProperties)
                : undefined
            }
          >
            {glowOk && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={glowSrc}
                alt=""
                aria-hidden="true"
                className="jjk-glow"
                onError={() => setGlowOk(false)}
              />
            )}

            {showTwinkle &&
              TWINKLE.map((plate, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={plate}
                  src={plate}
                  alt=""
                  aria-hidden="true"
                  className={`jjk-twinkle ${i === 0 ? "jjk-twinkle-a" : "jjk-twinkle-b"}`}
                  onError={() => setTwinkleOk(false)}
                />
              ))}
          </div>
        </div>
      )}

      {animated && <div className="jjk-districts" aria-hidden="true" />}
    </div>
  );
}

export default CityBackdrop;
