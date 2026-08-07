"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { motion, useMotionValue, useTransform } from "motion/react";
import { CityBackdrop } from "@/components/city-backdrop";
import { CursedEnergy } from "@/components/cursed-energy";
import { FlyIn } from "@/components/fly-in";
import { KanjiTitle } from "@/components/kanji-title";
import { ZoomStreaks } from "@/components/zoom-streaks";
import {
  EXIT_SCALE,
  EXIT_TILT,
  PERSPECTIVE,
  RAMP_AT,
  REST_SCALE,
  REST_TILT,
} from "@/lib/flythrough";
import { lenisRef } from "@/lib/lenis";
import { setOpeningDone } from "@/lib/opening";
import { SEARCH_AT } from "@/lib/fly-path";
import { useReducedMotion } from "@/lib/motion";

/**
 * Hero — a title card you click through.
 *
 * ── The opening, on load ────────────────────────────────────────────────────
 *   1. the camera holds over Austria; a marker pulses on Graz; you click and it
 *      drops a level. Twice. (FlyIn)
 *   2. the four kanji draw themselves, one after the next
 *   3. only then does the rest of the type arrive
 *
 * Step 1 has no fixed length any more, so nothing below is timed from page load:
 * FlyIn reports its arrival and the title block MOUNTS at that moment, which
 * makes every delay in BEAT an offset from the landing without any arithmetic.
 *
 * There used to be a step between 1 and 2: the city sat dark and the night
 * struck on with a few flickers. It is gone. It was the only reason the landed
 * frame and the backdrop were ever two different pictures, and the move already
 * arrives on a lit city — striking the lights on after landing on them is a
 * thing happening to a picture you are already looking at.
 *
 * Timed from BEAT below. Change the sequence there, not in the individual
 * elements, or the order drifts apart the first time anyone touches it.
 *
 * ── The exit, on click ──────────────────────────────────────────────────────
 * The section is exactly one viewport tall and the page does not scroll while it
 * is on screen. One click plays the whole transition: the city rushes in and
 * EVERYTHING burns — the four kanji slowly, outlined one last time by the same
 * hot edge that drew them, and the rest of the type in a third of a second so it
 * is out of the way before the glyphs have properly caught. Then black, then
 * 道場 · THE ACADEMY.
 *
 * This used to be scroll-driven, over a tall section with a sticky child, and
 * every version of it had the same defect. The burn runs on a clock; scroll is
 * not a clock. A fast flick won the race and put the black up before the glyphs
 * had come apart. Lengthening the section only moved the threshold — a harder
 * flick still beat it — and rate-limiting the scroll did work, but it meant
 * fighting somebody's wheel for three seconds, which is a strange thing to do to
 * a person.
 *
 * A click has no speed. There is nothing left to outrun, so the sequence is just
 * a sequence: it always plays, it always plays at the same pace, and every
 * timing below can be read off one clock instead of guessed against an input
 * nobody controls.
 *
 * What this gives up, deliberately: scrolling does nothing at all here. Somebody
 * who spins the wheel expecting the page to move will find that it does not.
 * That is why the cue says CLICK instead of implying a scroll, and why the cue
 * is a real focusable button — a full-screen gate you can only pass with a
 * pointer is a dead end for anyone on a keyboard.
 *
 * Under `prefers-reduced-motion` none of this exists. No gate, no scroll lock,
 * no burn: the section is one screen tall and the page scrolls past it normally.
 *
 * Layers, bottom to top:
 *   0  Graz from above — the cold read flickering to the ember one
 *   1  rising embers — held back until the night has struck
 *   2  warm wash plus the scrims that keep the type readable
 *   3  the title
 *
 * The CTAs that used to live here now rely on the sticky header — see the note
 * in app/page.tsx if that needs to change back.
 */

/**
 * Seconds after the CAMERA LANDS, not after page load.
 *
 * The title block does not exist until then, so these are plain delays on
 * freshly mounted elements — no arithmetic, and no way for the opening's
 * variable length to push anything out of order.
 */
const BEAT = {
  /** The half-beat of stillness before the title starts building. */
  duskHold: 0,
  /** First glyph starts drawing. */
  kanji: 0.7,
  /** Gap between glyph starts. Each glyph traces for 1.5s (see globals.css). */
  kanjiStagger: 0.4,
  /** Everything after the glyphs. */
  furigana: 3.75,
  rule: 4.0,
  latin: 4.25,
  city: 4.85,
  cue: 5.45,
  /** Embers, once the frame has settled. */
  embers: 0.4,
};

/**
 * Seconds from page load before the backdrop's own plates are put in the DOM.
 *
 * They are four pictures at 4000×2250 and not one pixel of them is visible while
 * the opening is running — it is showing the same city out of its own, smaller
 * copy. Loading them on the first paint was a large part of why the opening used
 * to stall. This cannot key off the landing any more, because the landing is now
 * up to the reader.
 *
 * Keyed to the moment the search starts, which is the first beat that can afford
 * it: the question has finished typing, the network has been idle since the
 * opening's own two pictures arrived, and there is still five seconds of search
 * and fire before anybody can click. Earlier and a nine-megapixel decode lands in
 * the middle of the typing, which is the one beat where nothing else is moving
 * and a hitch is the only thing to look at.
 */
const BACKDROP_AT = SEARCH_AT;

/**
 * How long the exit takes, start to finish, in seconds.
 *
 * Set by the burn, which is the slowest thing in it: 2.8s for the last glyph's
 * bloom plus 0.72s of per-glyph stagger (0.24 × 3), so 3.52s before the title is
 * really gone. `CURTAIN.fadeIn` × this has to land at or after that number, or
 * the curtain starts dimming glyphs that are still alight — 0.76 × 4.7 ≈ 3.6s.
 *
 * Long for a transition, and deliberately so: this is the one thing on the page
 * that is meant to be watched rather than got past, and it plays once per load.
 * If it wants shortening, shorten it here and shorten `jjk-kanji-burn-*` in
 * globals.css by the same factor — the two numbers are one number.
 */
const EXIT_SECONDS = 4.7;

/**
 * Curtain stops, as fractions of EXIT_SECONDS.
 *
 * These used to be fractions of the sticky pin, which was a standing source of
 * off-by-a-viewport bugs: the pin is the section height MINUS one viewport, not
 * the section height, and getting that wrong let the block start sliding away
 * before the black had arrived. Against a clock there is no such trap.
 */
const CURTAIN = {
  /**
   * Where black starts coming in.
   *
   * Late, and it has to stay late — at or past the end of the burn, which is
   * 3.52s, i.e. 0.75 of EXIT_SECONDS. The curtain is FIXED at z-85, so unlike
   * `veil` it darkens the burning glyphs along with everything else. An earlier
   * version started it at 0.28 and dimmed the title through the entire burn,
   * which is the opposite of watching the kanji come apart against black. The
   * background is taken down by `veil` instead, which sits under the title at
   * z-2 and leaves it alone; by the time this begins there is nothing on screen
   * but the last of the burn.
   */
  fadeIn: 0.76,
  /** Where it is fully black. Roughly half a second after `fadeIn`. */
  black: 0.9,
  /** Where the hero unmounts. Must be past `black`. */
  collapse: 0.96,
} as const;

/** Seconds the curtain takes to lift once the hero is gone. */
const CURTAIN_LIFT = 0.9;

export function Hero(): ReactNode {
  const sectionRef = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();

  /** 0 → 1 across the exit. Driven by a clock, not by scroll. */
  const progress = useMotionValue(0);

  // The burn is a one-way CSS animation on its own clock — see kanji-title.tsx
  // for why it is not scrubbed by a scroll position.
  const [burning, setBurning] = useState(false);
  const burn = burning ? "on" : undefined;

  // Once true the hero is gone for good. Deliberately one-way: this is what
  // makes it feel like a different page rather than a section you can go back
  // and look at again.
  const [gone, setGone] = useState(false);

  // True once the camera has landed — reported by FlyIn, because the reader
  // decides when that is. Everything that only matters AFTER the opening waits
  // on it: the title, the streaks, the backdrop's drift, and the click that
  // starts the exit.
  const [landed, setLanded] = useState(false);
  const onLanded = useCallback(() => {
    setLanded(true);
    setOpeningDone(true);
  }, []);

  // Tell the rest of the app the opening is up, so the ring cursor takes the
  // pointer and the ember plume stays out of the way — see lib/opening.ts. The
  // cleanup matters: without it a hero that unmounts before it lands would leave
  // the whole site in "opening" mode.
  useEffect(() => {
    if (reduced) return;
    setOpeningDone(false);
    return () => setOpeningDone(true);
  }, [reduced]);

  // Scale and tilt both come from lib/flythrough.ts, which zoom-streaks.tsx
  // reads as well — those echoes are copies of this same plate running ahead of
  // it, and any disagreement shows up immediately as three misregistered
  // pictures instead of motion blur.
  //
  // The tilt is what turns a map into a place. The backdrop is a plan view; the
  // frame it is modelled on is seen at an angle, and leaning the plane further
  // away as the scale grows is the cue that you are dropping toward ground
  // rather than being pushed at a picture.
  const cityScale = useTransform(progress, [0, RAMP_AT], [REST_SCALE, EXIT_SCALE]);
  const cityTilt = useTransform(progress, [0, RAMP_AT], [REST_TILT, EXIT_TILT]);
  const cityOpacity = useTransform(progress, [0, 0.14, 0.3], [1, 1, 0.35]);
  const curtain = useTransform(progress, [CURTAIN.fadeIn, CURTAIN.black], [0, 1]);

  // ── Putting the city out while the glyphs are still burning ────────────────
  // The stretch after the burn finished used to be the ugly part of the exit:
  // nothing on screen but a photograph scaled well past its resolution, waiting
  // for a curtain. So the darkening now happens DURING the burn instead of
  // after it, and by the time the last glyph is gone there is almost nothing
  // left to look at — which is what lets the curtain come late and go quickly.
  //
  // `lights` runs the opening backwards. It dims the glow and twinkle plates via
  // a custom property (see `.jjk-glow` in globals.css), leaving the unlit plate
  // untouched: the streetlights go out as you fly at them, and what you are left
  // with is the dark city the page started from. `veil` then takes the rest of
  // the frame down, so the two together do the work the curtain used to do alone.
  //
  // Both move fast and are done early. The glyphs need roughly 2.6s to burn and
  // they are the only thing worth watching, so the frame gets out of their way
  // in the first third rather than fading alongside them: by the time the burn
  // is properly under way it is happening against near-black, which is the only
  // background a thin hot outline actually reads against.
  const lights = useTransform(progress, [0, 0.07, 0.19], [1, 0.55, 0]);
  const veil = useTransform(progress, [0, 0.09, 0.22], [0, 0.68, 0.97]);

  // The embers go with the click. They belong to the title card standing still
  // — once the thing is burning down they are one more moving object competing
  // with the glyphs, and they are the wrong kind of fire for the moment.
  const embers = useTransform(progress, [0, 0.05], [1, 0]);

  const start = useCallback((): void => {
    if (reduced) return;
    setBurning(true);
  }, [reduced]);

  // ── The scroll lock ────────────────────────────────────────────────────────
  // The section is one viewport tall, so without this a wheel gesture would pull
  // the next section up over a hero nobody has dismissed. Lenis owns the scroll
  // and is the thing that actually has to be told; `overflow: hidden` is the
  // belt to its braces, covering the routes Lenis does not intercept — dragging
  // the scrollbar, Page Down, find-in-page.
  //
  // Lenis is mounted by a provider further up the tree and may not have put
  // itself in the shared ref yet when this runs on first paint, hence the short
  // poll rather than a single call.
  useEffect(() => {
    if (reduced || gone) return;

    const html = document.documentElement;
    const previousOverflow = html.style.overflow;
    html.style.overflow = "hidden";

    let tries = 0;
    let frame: number | null = null;
    const grab = (): void => {
      const lenis = lenisRef.current;
      if (lenis) {
        lenis.stop();
        frame = null;
        return;
      }
      frame = tries++ < 30 ? requestAnimationFrame(grab) : null;
    };
    grab();

    return () => {
      if (frame !== null) cancelAnimationFrame(frame);
      html.style.overflow = previousOverflow;
      lenisRef.current?.start();
    };
  }, [reduced, gone]);

  // ── The exit, on a clock ───────────────────────────────────────────────────
  useEffect(() => {
    if (!burning || reduced) return;

    const t0 = performance.now();
    const budget = EXIT_SECONDS * 1000;
    let frame: number | null = null;

    const tick = (now: number): void => {
      const p = Math.min(1, (now - t0) / budget);
      progress.set(p);
      if (p >= CURTAIN.collapse) {
        frame = null;
        setGone(true);
        return;
      }
      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => {
      if (frame !== null) cancelAnimationFrame(frame);
    };
  }, [burning, reduced, progress]);

  useLayoutEffect(() => {
    if (!gone) return;
    // The hero was the first thing in the document, so with it removed the top
    // of the page is the next section. The scroll was locked the whole time it
    // was up, so this is normally already 0 — it earns its keep after a reload
    // where the browser restored a scroll position. Go through Lenis, which owns
    // the scroll and would otherwise animate straight back.
    const lenis = lenisRef.current;
    if (lenis) lenis.scrollTo(0, { immediate: true, force: true });
    else window.scrollTo(0, 0);
  }, [gone]);

  useEffect(() => {
    if (!gone) return;
    // Every ScrollTrigger below just had its start and end positions moved by a
    // section height. A resize event is the documented way to make them
    // recalculate without importing GSAP here.
    window.dispatchEvent(new Event("resize"));
  }, [gone]);

  if (gone) {
    return (
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-[85] bg-background-deep"
        style={{ animation: `jjk-curtain-lift ${CURTAIN_LIFT}s ease-out forwards` }}
      />
    );
  }

  // `exactOptionalPropertyTypes` is on in this repo, so `style={undefined}` is a
  // type error — the prop has to be omitted entirely rather than set to nothing.
  const anim = <T extends object>(style: T) => (reduced ? {} : { style });

  return (
    <section
      ref={sectionRef}
      id="hero"
      className="relative h-screen w-full bg-background-deep"
      {...(reduced || !landed ? {} : { onClick: start })}
      {...(reduced || burning || !landed ? {} : { style: { cursor: "pointer" } })}
    >
      <div className="jjk-ink relative flex h-full w-full items-center justify-center overflow-hidden">
        {/* ---- 0 · Graz, cold read flickering to ember ------------------ */}
        <motion.div
          className="absolute inset-0"
          {...anim({
            transformPerspective: PERSPECTIVE,
            scale: cityScale,
            rotateX: cityTilt,
            opacity: cityOpacity,
            // Inherited by every layer inside CityBackdrop. Set here rather than
            // passed as a prop so CityBackdrop stays unaware of the exit.
            "--jjk-lights": lights,
          })}
        >
          {/* No `intro`. The night used to strike on with a few flickers once
              the move had landed; it is gone, and with it the only reason the
              backdrop and the move's last frame were ever different pictures.
              The city is simply lit, from the first frame, which is what the
              fly-in has been showing the whole way down.

              `driftDelay` holds the slow push-in until the move is over — see
              CityBackdrop. */}
          {/* No `intro`. The night used to strike on with a few flickers once
              the move had landed; it is gone, and with it the only reason the
              backdrop and the move's last frame were ever different pictures.

              `driftDelay` holds the slow push-in until the move is over: the
              move ends on this backdrop's own picture at its own size, and a
              drift already six percent in by then turns the hand-over into a
              jump to a differently framed map. 999 is "not yet"; flipping it to
              0 starts the animation from its first keyframe, which is identity,
              so there is nothing to see at the moment it begins. */}
          <CityBackdrop
            intro={false}
            driftDelay={landed ? 0 : 999}
            loadDelay={BACKDROP_AT}
          />
          {/* Inside the city wrapper, so it inherits the same scale, tilt and
              perspective — the fly-in has to arrive at the framing the exit
              will later fly out of, not at a slightly different one.

              It runs across `duskHold`, the beat that already existed for the
              backdrop to sit still in. That is deliberate: bolting the move on
              in front would have made the opening eight seconds long before the
              title is even drawn, whereas here it costs nothing at all. The
              night strikes on the landed frame exactly when it always did. */}
          <FlyIn onLanded={onLanded} />
        </motion.div>

        {/* ---- 1 · Embers, once the night has struck -------------------- */}
        {/* Faded out AND unmounted. The fade alone is what you want visually,
            but these are individually animated elements on their own clocks, and
            leaving them mounted behind an opacity of zero kept them running
            through the whole burn for no reason. */}
        {landed && !burning && (
          <motion.div
            className="pointer-events-none absolute inset-0 z-[1]"
            {...anim({ opacity: embers })}
          >
            <CursedEnergy delay={BEAT.embers} />
          </motion.div>
        )}

        {/* ---- 1b · The fly-through's motion blur ----------------------- */}
        {/* Above the scrims rather than below them: these are light, and a scrim
            whose whole job is to hold light down would eat them. Invisible until
            the exit starts, so it costs nothing while the title card sits. */}
        {/* Not before the landing. These are three copies of the 4000×2250 glow
            plate, and mounting them at page load meant nine more megapixels
            decoding in the same instant as the opening — for a layer that is
            invisible until somebody clicks. */}
        {!reduced && landed && <ZoomStreaks progress={progress} className="z-[3]" />}

        {/* ---- 2 · Warm wash + legibility scrims ------------------------ */}
        {/* Both of these exist to make TYPE readable, and there is no type on
            screen until the move has landed. They used to be timed off the
            flicker; with the flicker gone they come in on the landing itself,
            over the 1.6s before the first glyph — so the frame you fly into is
            the frame you flew toward, and the scrims settle onto it after. */}
        {landed && (
        <motion.div
          aria-hidden="true"
          className="jjk-flicker-slow pointer-events-none absolute inset-0 z-[2]"
          style={{ background: "rgba(211,32,42,0.05)" }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.6, delay: BEAT.duskHold }}
        />
        )}
        {landed && (
        <motion.div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-[2]"
          style={{
            background:
              "radial-gradient(ellipse 72% 58% at 50% 50%, rgba(3,3,4,0.76) 0%, rgba(3,3,4,0.54) 45%, rgba(3,3,4,0.22) 72%, transparent 100%)",
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.8, delay: BEAT.duskHold }}
        />
        )}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 z-[2] h-40"
          style={{
            background: "linear-gradient(to top, var(--background) 8%, transparent 100%)",
          }}
        />

        {/* ---- 2b · The frame going out ---------------------------------- */}
        {/* Under the streaks so they still cut through it while they last, over
            everything else. The title is z-20 and untouched: the glyphs have to
            burn in front of a darkening city, not darken along with it. */}
        {!reduced && (
          <motion.div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 z-[2] bg-background-deep"
            style={{ opacity: veil }}
          />
        )}

        {/* ---- 3 · The title ------------------------------------------- */}
        <h1 className="sr-only">
          Jiu-Jitsu Kaisen Academy — Brazilian Jiu-Jitsu in Graz
        </h1>

        {landed && (
        <motion.div
          aria-hidden="true"
          className="relative z-20 flex w-full max-w-[1600px] select-none flex-col items-center px-4 text-center"
        >
          {/* Furigana sits above the kanji but arrives after them — it belongs
              to the "rest of the type" beat, not to the glyph build. */}
          <motion.span
            initial={{ opacity: 0, y: 8, filter: "blur(6px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ duration: 0.9, delay: BEAT.furigana, ease: [0.22, 1, 0.36, 1] }}
            className="font-jp mb-[0.4em] block text-[clamp(0.6rem,1.5vw,1.15rem)] tracking-[0.55em] text-foreground/70"
          >
            <span className="jjk-burn-text block" data-burn={burn}>
              じゅうじゅつかいせん
            </span>
          </motion.span>

          {/* The four kanji, drawn by cursed energy — and taken back by it. */}
          <KanjiTitle
            className="w-[min(94vw,68rem)]"
            delay={BEAT.kanji}
            stagger={BEAT.kanjiStagger}
            burning={burning}
          />

          <motion.div
            initial={{ opacity: 0, scaleX: 0 }}
            animate={{ opacity: 1, scaleX: 1 }}
            transition={{ duration: 1.2, delay: BEAT.rule, ease: [0.22, 1, 0.36, 1] }}
            className="mt-7 w-[min(70vw,44rem)] sm:mt-10"
          >
            <div className="jjk-rule jjk-burn-rule" data-burn={burn} />
          </motion.div>

          {/* Latin lockup — arrives after the glyphs have landed. Plain motion
              rather than a per-character stagger on purpose: the kanji build is
              the event here, and a second letter animation competes with it. */}
          <motion.span
            initial={{ opacity: 0, y: 14, filter: "blur(8px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ duration: 1, delay: BEAT.latin, ease: [0.22, 1, 0.36, 1] }}
            className="font-display jjk-aberrate mt-7 block text-[clamp(1.05rem,3.2vw,2.9rem)] tracking-[0.24em] text-foreground/90 sm:mt-9"
          >
            <span className="jjk-burn-text block" data-burn={burn}>
              JIU-JITSU KAISEN ACADEMY
            </span>
          </motion.span>

          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: BEAT.city }}
            className="mt-10 text-[0.6rem] font-semibold uppercase tracking-[0.5em] text-foreground/45 sm:mt-14"
          >
            <span className="jjk-burn-text block" data-burn={burn}>
              Graz
            </span>
          </motion.span>
        </motion.div>
        )}

        {/* ---- The cue --------------------------------------------------
            A real <button>, not decoration. The whole section is clickable, but
            a full-screen gate that only answers to a pointer cannot be passed on
            a keyboard, and this is the only way through it. */}
        {landed && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: BEAT.cue, duration: 0.9 }}
          className="absolute bottom-6 left-1/2 z-20 -translate-x-1/2"
        >
          <button
            type="button"
            onClick={start}
            aria-label="Continue into the site"
            className="jjk-burn-text flex cursor-pointer flex-col items-center gap-2 rounded-full border border-accent/25 px-7 py-3 text-accent/60 transition-colors hover:border-accent/60 hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
            data-burn={burn}
          >
            <span className="font-jp text-[0.55rem] tracking-[0.4em]">つづく</span>
            <span className="font-display animate-pulse text-[0.6rem] tracking-[0.45em]">
              CLICK
            </span>
          </button>
        </motion.div>
        )}
      </div>

      {/* The curtain. Fixed to the viewport, above the header, so the section
          boundary crosses behind it without ever being seen moving. */}
      {!reduced && (
        <motion.div
          aria-hidden="true"
          className="pointer-events-none fixed inset-0 z-[85] bg-background-deep"
          style={{ opacity: curtain }}
        />
      )}
    </section>
  );
}

export default Hero;
