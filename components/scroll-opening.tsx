"use client";

/**
 * ScrollOpening — the Sanjō scroll, unrolled at speed, stopped on the fire.
 *
 * ── What the reader sees ────────────────────────────────────────────────────
 * The hero is one painting: the Night Attack on the Sanjō Palace (Heiji
 * monogatari emaki, 13th c., MFA Boston — public-domain scan via Wikimedia
 * Commons). The strip stands still for a breath, then is pulled right-to-left
 * like a scroll being unrolled too fast to read — cavalry streaming past —
 * and comes to rest on the blaze. The title column slams in, a seal is
 * pressed, and the warm light settles down into the site's night. No click,
 * no cut: the page below begins in the same darkness the fire sinks into.
 *
 * Why THIS painting: the site below is read like an emaki (Kyōsai's night
 * parade under a carried light), and its entire palette — accent, ember,
 * ember-hot — is already in these flames. The opening teaches the page's
 * grammar in two seconds and hands its colours over at the end.
 *
 * ── How it moves ────────────────────────────────────────────────────────────
 * One <img> inside an overflow-hidden frame. The scrub is a single CSS
 * animation on `translate` (GPU-composited, no per-frame JS); the push-in is
 * a second, slower animation on the wrapper. All timing lives in
 * app/globals.css under "THE OPENING — the scroll run".
 *
 * The strip is 5304×1000 with the run-up's motion blur baked into the asset
 * (scripts/gen-scroll-run.py) — the pixels that fly past are pre-smeared, the
 * landing zone is sharp, and the WebP spends its bytes where the eye stops.
 * Displayed at 100% frame height, the strip is 530.4 units wide per 100 units
 * of height; the CSS positions it in vh for exactly that reason.
 *
 * ── Degradation ─────────────────────────────────────────────────────────────
 * No WebGL, no canvas. Without JS the markup still renders and the CSS still
 * runs; without CSS animation support the strip rests at its end position
 * (`both` fill + reduced-motion override pin the final frame). Under
 * `prefers-reduced-motion` nothing moves: the fire, the title and the seal
 * simply stand.
 */

import { useEffect, useRef, type ReactNode } from "react";
import { setOpeningDone } from "@/lib/opening";
import { useReducedMotion } from "@/lib/motion";
import { siteConfig } from "@/lib/config";

/** The scrub lands on the fire this long after the animations are released. */
const LANDING_MS = 2350;

export function ScrollOpening(): ReactNode {
  const reduced = useReducedMotion();
  const rootRef = useRef<HTMLElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  // Nothing moves until the strip has decoded: every animation in the CSS is
  // born paused and `data-ready` releases them all together. Otherwise the
  // scrub plays against a frame the browser has not painted yet and the whole
  // run happens on a black screen. decode() failing (old browser, cancelled
  // load) releases them anyway — a late image is better than no opening.
  //
  // The ember plume waits for the landing; the ring cursor owns the pointer
  // until then — the same handover contract the site already has, see
  // lib/opening.ts. Under reduced motion nothing runs, so nothing is undone.
  useEffect(() => {
    if (reduced) return;
    setOpeningDone(false);
    let landing: number | null = null;
    let cancelled = false;
    const release = (): void => {
      if (cancelled) return;
      rootRef.current?.setAttribute("data-ready", "");
      landing = window.setTimeout(() => setOpeningDone(true), LANDING_MS);
    };
    const img = imgRef.current;
    if (img) {
      img.decode().then(release, release);
    } else {
      release();
    }
    return () => {
      cancelled = true;
      if (landing !== null) window.clearTimeout(landing);
      setOpeningDone(true);
    };
  }, [reduced]);

  // No data-ready branch for reduced motion: that media query replaces every
  // animation with `none`, so there is nothing for the gate to hold.
  return (
    <section
      ref={rootRef}
      className="jjk-scroll-opening"
      aria-label={siteConfig.fullName}
    >
      <div className="jjk-scroll-frame" aria-hidden="true">
        {/* Plain <img>, deliberately: the asset is already sized and
            compressed for exactly this use, and the optimizer resizing a
            5304px strip would only soften the one zone that must stay sharp. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          ref={imgRef}
          className="jjk-scroll-strip"
          src="/img/scroll-run.webp"
          alt=""
          fetchPriority="high"
          decoding="async"
          draggable={false}
        />
      </div>

      {/* The title column. h1 for the page; the glyphs carry the site's
          existing kanji treatment (black fill, cream stroke, red bloom). The
          seal sits inside the lockup so it hangs under the column at every
          viewport without a second set of coordinates. */}
      <h1 className="jjk-scroll-title">
        <span className="jjk-scroll-title-col jjk-kanji" lang="ja">
          柔術廻戦
        </span>
        <span className="jjk-scroll-seal" aria-hidden="true" lang="ja">
          柔
        </span>
        <span className="sr-only">{siteConfig.fullName}</span>
      </h1>

      {/* The gloss: who this actually is, in the site's display voice. */}
      <p className="jjk-scroll-sub" aria-hidden="true">
        {siteConfig.fullName.toUpperCase()} · BRAZILIAN JIU-JITSU · GRAZ
      </p>

      {/* The handoff: the fire's light settling into the page's night. The
          bottom fade is always there; the settle layer darkens the whole
          frame once the title has landed. */}
      <div className="jjk-scroll-settle" aria-hidden="true" />
      <div className="jjk-scroll-foot" aria-hidden="true" />
    </section>
  );
}

export default ScrollOpening;
