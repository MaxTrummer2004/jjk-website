"use client";

/**
 * ScrollOpening — the palace on fire, and the way out of it.
 *
 * ── What the reader sees ────────────────────────────────────────────────────
 * The page opens already on the picture: the Night Attack on the Sanjō Palace
 * (Heiji monogatari emaki, 13th c., MFA Boston — public-domain scan via
 * Wikimedia Commons), standing still, barely alight. Over about two seconds it
 * catches — flares, then settles — and the four glyphs are written over it in
 * cursed energy. Then it waits.
 *
 * The reader clicks, and everything goes out in order: the glyphs burn away,
 * the fire dies down over three seconds, and the darkness that replaces it is
 * the darkness the next section starts in. A line at the bottom says which way,
 * a torch opens out of the cursor, and only then does the page let go of the
 * scroll. By the time it does there is nothing at the boundary to see — the
 * reader is already standing in the next room, holding the light.
 *
 * ── Why the scroll is held ──────────────────────────────────────────────────
 * Not to make anybody watch. It is held because the section below is a dark
 * room you read by torchlight, and arriving there mid-flare — fire still up, no
 * torch in hand — is arriving at a black screen. The gate exists so that the
 * two states are the same state at the moment they meet.
 *
 * It is one-way and it is short. Anybody who wants past it presses once.
 *
 * ── The two plates ──────────────────────────────────────────────────────────
 *   scroll-cold.webp   the painting as a wall: near-black, ink, no browns.
 *   scroll-glow.webp   the light, on black, screened over it.
 *
 * The same pair, in the same roles, with the same blend as `.jjk-wall` and
 * `.jjk-wall-glow` below — and out of the same grading function, so the two
 * surfaces match by construction rather than by two people tuning towards each
 * other. Catching and going out are one opacity ramp on the second plate.
 *
 * ── The torch is not a copy ─────────────────────────────────────────────────
 * The section is wrapped in its own `WallLight` (see app/page.tsx) and renders
 * the wall's own `.jjk-veil` and `.jjk-candle`. Same component, same elements,
 * same variables. Two lighting rigs meant to look identical will drift, and the
 * seam between them is exactly where anybody looking at this page will be
 * looking — so there is one rig, used twice.
 *
 * ── How it moves ────────────────────────────────────────────────────────────
 * Nothing translates. Every animation is `opacity` or one of two registered
 * custom properties, and all of it lives in app/globals.css under "THE OPENING
 * — the palace on fire". The constants below are only the clock this file needs
 * in order to mount things and hand the scroll back at the right moments.
 */

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { KanjiTitle } from "@/components/kanji-title";
import { setOpeningDone } from "@/lib/opening";
import { useReducedMotion } from "@/lib/motion";
import { lenisRef } from "@/lib/lenis";
import { siteConfig } from "@/lib/config";

/**
 * The steps, in the order the reader meets them. A ladder rather than a set of
 * booleans: every one of these implies all the ones before it, and comparing
 * with `>=` is what keeps that true without six flags to keep in step.
 */
const STEP = {
  LIGHTING: 0, // the fire catches over the bare picture
  TITLED: 1, //   the glyphs are written
  WAITING: 2, //  the cue is up; nothing moves until the reader presses
  BURNING: 3, //  the glyphs catch, the fire begins to go out
  ONWARD: 4, //   the darkness has arrived; a line says which way
  TORCH: 5, //    the light opens out of the cursor
  OPEN: 6, //     the scroll is handed back
} as const;

/**
 * The clock, in milliseconds, and every one of these has a twin in globals.css.
 * This file holds only the moments when something MOUNTS or when the scroll
 * changes hands; the animation timings themselves live in the stylesheet.
 *
 * Before the click:  0.7–2.9 s the fire catches · 2.9–4.2 s it settles back
 * After the click:   0.5–3.7 s the fire goes out and the night comes up
 */
const TITLE_AT = 3000;
const CUE_AT = 5600;
const ONWARD_AT = 3900;
const TORCH_AT = 4300;
const RELEASE_AT = 5700;

export function ScrollOpening(): ReactNode {
  const reduced = useReducedMotion();
  const rootRef = useRef<HTMLElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const timers = useRef<number[]>([]);
  const [step, setStep] = useState<number>(STEP.LIGHTING);

  const at = useCallback((ms: number, next: number): void => {
    timers.current.push(window.setTimeout(() => setStep(next), ms));
  }, []);

  // ── The way in ────────────────────────────────────────────────────────────
  // Nothing catches until the cold plate has DECODED: the ignition in the CSS
  // is born paused and `data-ready` releases it. Otherwise the fire comes up
  // over a frame the browser has not painted yet. A failed decode (old browser,
  // cancelled load) releases it anyway — a late picture beats no opening.
  useEffect(() => {
    if (reduced) return;
    setOpeningDone(false);
    // A reload can restore a scroll position, and this section is a gate: it
    // has to be gating from the top or it is gating nothing.
    window.scrollTo(0, 0);
    let cancelled = false;
    const release = (): void => {
      if (cancelled) return;
      rootRef.current?.setAttribute("data-ready", "");
      at(TITLE_AT, STEP.TITLED);
      at(CUE_AT, STEP.WAITING);
    };
    const img = imgRef.current;
    if (img) void img.decode().then(release, release);
    else release();
    const running = timers.current;
    return () => {
      cancelled = true;
      for (const t of running) window.clearTimeout(t);
      setOpeningDone(true);
    };
  }, [reduced, at]);

  // ── The way out ───────────────────────────────────────────────────────────
  // One press, and everything after it is on a timer rather than on the
  // reader: there is nothing more to decide, only to watch.
  const leave = useCallback((): void => {
    setStep((current) => {
      if (current !== STEP.WAITING) return current;
      at(ONWARD_AT, STEP.ONWARD);
      at(TORCH_AT, STEP.TORCH);
      at(RELEASE_AT, STEP.OPEN);
      // The ember plume takes the pointer as the torch opens: from here on the
      // reader IS the light, in this section and in every one below it. See
      // lib/opening.ts for the handover this is one half of.
      timers.current.push(
        window.setTimeout(() => setOpeningDone(true), TORCH_AT),
      );
      return STEP.BURNING;
    });
  }, [at]);

  // ── Holding the scroll ────────────────────────────────────────────────────
  // Both halves are needed. Lenis owns the wheel and would animate straight
  // back to wherever it thinks the page should be, so it has to be stopped;
  // `overflow: hidden` stops everything Lenis does not own — keyboard, touch
  // drag, find-in-page, an anchor in the header.
  const locked = !reduced && step < STEP.OPEN;
  useEffect(() => {
    if (!locked) return;
    const root = document.documentElement;
    const previous = root.style.overflow;
    root.style.overflow = "hidden";
    lenisRef.current?.stop();
    return () => {
      root.style.overflow = previous;
      lenisRef.current?.start();
    };
  }, [locked]);

  // Under reduced motion the section is simply the lit frame with its title on
  // it: no gate, no burn, no torch, and the page scrolls the way it always did.
  const burning = !reduced && step >= STEP.BURNING;
  const burn = burning ? "on" : undefined;

  return (
    <section
      ref={rootRef}
      className="jjk-scroll-opening"
      aria-label={siteConfig.fullName}
      {...(burning ? { "data-out": "" } : {})}
      {...(!reduced && step >= STEP.TORCH ? { "data-torch": "" } : {})}
      {...(step === STEP.WAITING ? { onClick: leave } : {})}
    >
      <div className="jjk-scroll-frame" aria-hidden="true">
        {/* Plain <img>, deliberately: both plates are already sized and
            compressed for exactly this use, and the image optimizer resizing a
            3623px plate would soften a picture whose whole job is to be looked
            at closely.

            The glow must be a SIBLING with the same geometry, not a positioned
            div — an earlier version made it a `<div>` with `inset: 0`, which
            does not pick up the plate's translate, and the light ended up
            hundreds of viewport-heights away from the fire it was coming
            from. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          ref={imgRef}
          className="jjk-scroll-plate jjk-scroll-cold"
          src="/img/scroll-cold.webp"
          alt=""
          fetchPriority="high"
          decoding="async"
          draggable={false}
        />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          className="jjk-scroll-plate jjk-scroll-glow"
          src="/img/scroll-glow.webp"
          alt=""
          decoding="async"
          draggable={false}
        />
      </div>

      <h1 className="sr-only">
        {siteConfig.fullName}: Brazilian Jiu-Jitsu in Graz
      </h1>

      {/* Mounted once the fire is up, so KanjiTitle's own draw clock starts
          then and needs no gate of its own. */}
      {(reduced || step >= STEP.TITLED) && (
        <div className="jjk-scroll-lockup" aria-hidden="true">
          <span className="jjk-scroll-furigana" lang="ja">
            <span className="jjk-burn-text block" data-burn={burn}>
              じゅうじゅつかいせん
            </span>
          </span>

          <KanjiTitle
            className="jjk-scroll-kanji"
            delay={0.35}
            stagger={0.42}
            burning={burning}
          />

          <div className="jjk-scroll-rule">
            <div className="jjk-rule jjk-burn-rule" data-burn={burn} />
          </div>

          <span className="jjk-scroll-latin">
            <span className="jjk-burn-text block" data-burn={burn}>
              {siteConfig.fullName.toUpperCase()}
            </span>
          </span>

          <span className="jjk-scroll-place">
            <span className="jjk-burn-text block" data-burn={burn}>
              Graz
            </span>
          </span>
        </div>
      )}

      {/* The night, and the torch in it. `.jjk-veil` and `.jjk-candle` are the
          wall's own elements — see components/lit-wall.tsx — inheriting their
          pointer and their radius from the WallLight this section is wrapped
          in. At `--unlit: 1` the veil's shade-map mask is a no-op and it
          resolves to the flat rgba(3, 3, 4, 0.93) the section below rests at,
          which is what makes the handover an identity rather than a match.

          Siblings, not nested: the candle screens, and a wrapper with an
          animated opacity would make it screen against the veil instead of
          against the painting. */}
      <div className="jjk-veil jjk-scroll-veil" aria-hidden="true" />
      <div className="jjk-candle jjk-scroll-candle" aria-hidden="true" />

      {/* The gate. A real button, because a full-screen click target cannot be
          passed on a keyboard and this is the only way through it. */}
      {step === STEP.WAITING && (
        <button
          type="button"
          className="jjk-scroll-cue"
          onClick={leave}
          aria-label="Weiter: das Feuer erlischt"
        >
          <span className="jjk-scroll-cue-jp" lang="ja" aria-hidden="true">
            つづく
          </span>
          <span className="jjk-scroll-cue-en" aria-hidden="true">
            KLICK
          </span>
        </button>
      )}

      {/* And the second cue, once there is somewhere to go. */}
      {!reduced && step >= STEP.ONWARD && (
        <div className="jjk-scroll-onward" aria-hidden="true">
          <span className="jjk-scroll-onward-jp" lang="ja">
            さきへ
          </span>
          <span className="jjk-scroll-onward-en">SCROLL</span>
          <span className="jjk-scroll-onward-arrow" />
        </div>
      )}
    </section>
  );
}

export default ScrollOpening;
