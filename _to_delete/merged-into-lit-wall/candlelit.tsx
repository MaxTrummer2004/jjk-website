"use client";

/**
 * Candlelit — a stretch of page you have to light up to read.
 *
 * The section sits on a painted wall in near-darkness. A pool of warm light
 * follows the pointer; text only becomes legible where the light falls, the way
 * the writing is uncovered in the opening.
 *
 * ── How the darkening works ─────────────────────────────────────────────────
 * A single veil element covers the region. Its background is a radial gradient
 * that is transparent at the pointer and opaque everywhere else — no
 * `mask-image`, no blend modes, nothing that behaves differently per browser.
 * The pointer position arrives as two custom properties written straight to the
 * element in a rAF-throttled listener; it never goes through React state,
 * because re-rendering a page section on every mouse move is not something you
 * do twice.
 *
 * ── The lag ─────────────────────────────────────────────────────────────────
 * The pool does not sit on the pointer, it follows it — the position eases
 * toward the cursor a few percent per frame. That single number is what makes
 * the section feel like carrying a lamp along a wall rather than like a
 * spotlight snapped to the mouse, and it is why things appear gradually instead
 * of popping in.
 *
 * ── Exempting something from the dark ───────────────────────────────────────
 * Give it `.jjk-lit` and it sits above the veil. Nothing uses it at the moment
 * — the images are in the dark with everything else — but the machinery is
 * here. Stacking order, no second copy of anything:
 *
 *     wall              z 0     visible only where the light falls
 *     content           auto    below the veil, therefore darkened
 *     veil              z 20    the darkness, with a hole at the pointer
 *     .jjk-lit          z 30    above the veil, therefore untouched
 *     candle glow       z 35    warm light, screened over everything
 *
 * The constraint that comes with it: nothing between this component and a
 * `.jjk-lit` element may create a stacking context — no `transform`, no
 * `filter`, no `z-index` on the wrappers in between — or the element is trapped
 * under the veil no matter what z-index it carries.
 *
 * Under `prefers-reduced-motion` the whole thing is off and the section renders
 * at full brightness. Content you can only reach by moving a mouse is content
 * some people cannot reach at all.
 */

import { useEffect, useRef, type ReactNode } from "react";
import { useReducedMotion } from "@/lib/motion";

export interface CandlelitProps {
  children: ReactNode;
  /** Radius of the readable pool, in pixels. */
  radius?: number;
  /** How dark the unlit parts go, 0–1. */
  darkness?: number;
  /**
   * How far the light from the section BELOW reaches up over the bottom edge,
   * in pixels.
   *
   * Not a styling choice. The emaki wall downstairs is lit by the figures
   * painted on it, and this is the distance those figures throw — the widest
   * radius in scripts/gen-wall.py, converted to display pixels. Setting it to
   * anything else would make the boundary a place where light behaves
   * differently, which is the exact thing it exists to remove.
   */
  spill?: number;
  /**
   * How quickly the pool catches up with the pointer, per frame. Lower drags
   * more. Below about 0.02 it stops reading as lag and starts reading as broken.
   */
  ease?: number;
  className?: string;
}

export function Candlelit({
  children,
  radius = 380,
  darkness = 0.93,
  spill = 700,
  ease = 0.055,
  className = "",
}: CandlelitProps): ReactNode {
  const rootRef = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();

  // Anchor the background tile grid to the document top so the tile origin
  // matches across sections. background-position: 0 -offsetTop means the tile
  // starts where it would if it were placed on the body — the section is just
  // a window into that larger virtual tile plane.
  useEffect(() => {
    const el = rootRef.current;
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

  useEffect(() => {
    const el = rootRef.current;
    if (!el || reduced) return;
    if (!window.matchMedia("(pointer: fine)").matches) return;

    let frame: number | null = null;
    // Where the pointer is, and where the light has got to.
    let tx = 0;
    let ty = 0;
    let lx = 0;
    let ly = 0;
    let seeded = false;

    const step = (): void => {
      lx += (tx - lx) * ease;
      ly += (ty - ly) * ease;
      el.style.setProperty("--lx", `${lx.toFixed(1)}px`);
      el.style.setProperty("--ly", `${ly.toFixed(1)}px`);

      // Park the loop once the light has effectively arrived, so a still
      // pointer costs nothing.
      if (Math.abs(tx - lx) > 0.5 || Math.abs(ty - ly) > 0.5) {
        frame = requestAnimationFrame(step);
      } else {
        frame = null;
      }
    };

    const onMove = (e: PointerEvent): void => {
      const rect = el.getBoundingClientRect();
      tx = e.clientX - rect.left;
      ty = e.clientY - rect.top;
      if (!seeded) {
        // First contact: start the pool under the cursor rather than sliding it
        // in from the corner.
        lx = tx;
        ly = ty;
        seeded = true;
      }
      if (frame === null) frame = requestAnimationFrame(step);
    };

    // The light only exists while the pointer is over the region. Leaving it lit
    // after the pointer has gone makes the section look broken rather than dark.
    const onEnter = (): void => el.style.setProperty("--lit", "1");
    const onLeave = (): void => el.style.setProperty("--lit", "0");

    el.addEventListener("pointermove", onMove, { passive: true });
    el.addEventListener("pointerenter", onEnter, { passive: true });
    el.addEventListener("pointerleave", onLeave, { passive: true });

    return () => {
      if (frame !== null) cancelAnimationFrame(frame);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerenter", onEnter);
      el.removeEventListener("pointerleave", onLeave);
    };
  }, [reduced]);

  if (reduced) return <div className={className}>{children}</div>;

  return (
    <div
      ref={rootRef}
      className={`jjk-candlelit ${className}`}
      style={
        {
          "--pool": `${radius}px`,
          "--dark": darkness,
          "--spill": `${spill}px`,
        } as React.CSSProperties
      }
    >
      <div className="jjk-wall" aria-hidden="true" />
      {children}
      <div className="jjk-veil" aria-hidden="true" />
      <div className="jjk-spill" aria-hidden="true" />
      <div className="jjk-candle" aria-hidden="true" />
    </div>
  );
}

export default Candlelit;
